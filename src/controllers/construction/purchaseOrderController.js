import { PurchaseOrder, Vendor, VendorPerformance } from '../../models/construction/vendor.js';
import Inventory from '../../models/construction/inventory.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Create purchase order
// @route   POST /api/purchase-orders
export const createPO = async (req, res) => {
    try {
        const { vendor, project, items, expectedDeliveryDate, gst } = req.body;

        // Calculate totals
        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
        const totalGst = (gst?.cgst || 0) + (gst?.sgst || 0) + (gst?.igst || 0);
        const grandTotal = totalAmount + totalGst;

        // Check vendor credit limit
        const vendorDoc = await Vendor.findById(vendor);
        if (vendorDoc.financialInfo.outstandingPayables + grandTotal > vendorDoc.financialInfo.creditLimit) {
            return res.status(400).json({ message: 'PO amount exceeds vendor credit limit' });
        }

        const po = await PurchaseOrder.create({
            vendor,
            project,
            items,
            totalAmount,
            gst: { ...gst, totalGst },
            grandTotal,
            expectedDeliveryDate,
            requestedBy: req.user._id,
            company: req.user.company,
            timeline: [{
                status: 'DRAFT',
                performedBy: req.user._id,
                note: 'PO created'
            }]
        });

        res.status(201).json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit PO for approval
// @route   PUT /api/purchase-orders/:id/submit
export const submitForApproval = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'PO not found' });

        po.status = 'PENDING_APPROVAL';
        po.approvals = [
            { level: 1, status: 'PENDING' }, // Procurement Manager
            { level: 2, status: 'PENDING' }  // Finance Head (if amount > threshold)
        ];
        po.timeline.push({
            status: 'PENDING_APPROVAL',
            performedBy: req.user._id,
            note: 'Submitted for approval'
        });

        await po.save();

        emitToCompany(po.company, 'PO_APPROVAL_PENDING', {
            poNumber: po.poNumber,
            amount: po.grandTotal,
            message: `PO ${po.poNumber} pending approval`
        });

        res.json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve PO
// @route   PUT /api/purchase-orders/:id/approve
export const approvePO = async (req, res) => {
    try {
        const { level, comments } = req.body;

        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'PO not found' });

        const approval = po.approvals.find(a => a.level === level);
        if (!approval) return res.status(400).json({ message: 'Invalid approval level' });

        approval.approver = req.user._id;
        approval.status = 'APPROVED';
        approval.comments = comments;
        approval.approvedAt = new Date();

        // Check if all approvals are complete
        const allApproved = po.approvals.every(a => a.status === 'APPROVED');
        if (allApproved) {
            po.status = 'APPROVED';
            po.timeline.push({
                status: 'APPROVED',
                performedBy: req.user._id,
                note: 'All approvals complete'
            });
        }

        await po.save();
        res.json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Issue PO to vendor
// @route   PUT /api/purchase-orders/:id/issue
export const issuePO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po || po.status !== 'APPROVED') {
            return res.status(400).json({ message: 'PO must be APPROVED before issuing' });
        }

        po.status = 'ISSUED';
        po.timeline.push({
            status: 'ISSUED',
            performedBy: req.user._id,
            note: 'PO issued to vendor'
        });

        await po.save();

        // Update vendor outstanding payables
        await Vendor.findByIdAndUpdate(po.vendor, {
            $inc: { 'financialInfo.outstandingPayables': po.grandTotal }
        });

        emitToCompany(po.company, 'PO_ISSUED', {
            poNumber: po.poNumber,
            message: `PO ${po.poNumber} issued to vendor`
        });

        res.json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record delivery (full or partial)
// @route   PUT /api/purchase-orders/:id/delivery
export const recordDelivery = async (req, res) => {
    try {
        const { items, note } = req.body;

        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'PO not found' });

        po.partialDeliveries.push({
            deliveryDate: new Date(),
            items,
            receivedBy: req.user._id,
            note
        });

        // Check if delivery is complete
        const totalDelivered = {};
        po.partialDeliveries.forEach(delivery => {
            delivery.items.forEach(item => {
                const matId = item.materialMaster.toString();
                totalDelivered[matId] = (totalDelivered[matId] || 0) + item.quantityDelivered;
            });
        });

        let isComplete = true;
        po.items.forEach(item => {
            const matId = item.materialMaster.toString();
            if ((totalDelivered[matId] || 0) < item.quantity) {
                isComplete = false;
            }
        });

        po.deliveryStatus = isComplete ? 'COMPLETE' : 'PARTIAL';
        po.status = isComplete ? 'DELIVERED' : 'IN_TRANSIT';
        po.actualDeliveryDate = isComplete ? new Date() : po.actualDeliveryDate;

        po.timeline.push({
            status: po.status,
            performedBy: req.user._id,
            note: `${isComplete ? 'Full' : 'Partial'} delivery recorded`
        });

        await po.save();

        // Update inventory for delivered items
        for (const item of items) {
            await Inventory.findOneAndUpdate(
                { materialMaster: item.materialMaster, company: po.company },
                {
                    $inc: {
                        totalStock: item.quantityDelivered,
                        availableStock: item.quantityDelivered
                    },
                    $push: {
                        timeline: {
                            action: 'PO_DELIVERY',
                            quantity: item.quantityDelivered,
                            performedBy: req.user.name,
                            note: `From PO ${po.poNumber}`
                        }
                    }
                },
                { upsert: true }
            );
        }

        // Update vendor delivery performance if complete
        if (isComplete) {
            const isOnTime = po.actualDeliveryDate <= po.expectedDeliveryDate;
            // This would update VendorPerformance metrics
        }

        res.json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Close PO
// @route   PUT /api/purchase-orders/:id/close
export const closePO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ message: 'PO not found' });

        po.status = 'CLOSED';
        po.timeline.push({
            status: 'CLOSED',
            performedBy: req.user._id,
            note: 'PO closed'
        });

        await po.save();
        res.json(po);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
export const getPurchaseOrders = async (req, res) => {
    try {
        const { vendor, project, status } = req.query;

        let filter = { company: req.user.company };
        if (vendor) filter.vendor = vendor;
        if (project) filter.project = project;
        if (status) filter.status = status;

        const pos = await PurchaseOrder.find(filter)
            .populate('vendor', 'name')
            .populate('project', 'name')
            .populate('requestedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(pos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
