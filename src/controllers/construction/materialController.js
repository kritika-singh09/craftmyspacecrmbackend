import { MaterialMaster, MaterialRequest, MaterialQuality } from '../../models/construction/material.js';
import Inventory from '../../models/construction/inventory.js';
import { emitToCompany } from '../../config/socket.js';
import { linkMaterialExpense } from '../financeController.js';

// ========================================
// MATERIAL MASTER REGISTRY
// ========================================

// @desc    Register a new material in the Master Registry
// @route   POST /api/materials/master
export const createMaterialMaster = async (req, res) => {
    try {
        const { itemCode, name, category, unit, brand, grade, specifications } = req.body;

        const existing = await MaterialMaster.findOne({ itemCode, company: req.user.company });
        if (existing) return res.status(400).json({ message: 'Item code already exists' });

        const material = await MaterialMaster.create({
            itemCode, name, category, unit, brand, grade, specifications,
            company: req.user.company
        });

        // Initialize empty inventory for this material
        await Inventory.create({
            materialMaster: material._id,
            company: req.user.company,
            totalStock: 0,
            availableStock: 0
        });

        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all materials in registry
// @route   GET /api/materials/master
export const getMaterialsMaster = async (req, res) => {
    try {
        const materials = await MaterialMaster.find({ company: req.user.company });
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========================================
// INVENTORY MANAGEMENT
// ========================================

// @desc    Get real-time inventory
// @route   GET /api/materials/inventory
export const getInventory = async (req, res) => {
    try {
        const inventory = await Inventory.find({ company: req.user.company })
            .populate('materialMaster')
            .populate('preferredVendor', 'name');
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update stock manually (e.g., procurement)
// @route   POST /api/materials/inventory/adjustment
export const adjustStock = async (req, res) => {
    try {
        const { materialMasterId, quantity, action, note, batchNumber, expiryDate } = req.body;

        const inv = await Inventory.findOne({ materialMaster: materialMasterId, company: req.user.company });
        if (!inv) return res.status(404).json({ message: 'Inventory record not found' });

        if (action === 'ADD') {
            inv.totalStock += Number(quantity);
            inv.availableStock += Number(quantity);
            if (batchNumber) {
                inv.batchInfo.push({ batchNumber, quantity: Number(quantity), expiryDate });
            }
        } else if (action === 'WASTE' || action === 'DAMAGE') {
            inv.availableStock -= Number(quantity);
            if (action === 'WASTE') inv.wastage += Number(quantity);
            if (action === 'DAMAGE') inv.damagedStock += Number(quantity);
        }

        inv.timeline.push({
            action: `${action} stock adjustment`,
            quantity: Number(quantity),
            performedBy: req.user.name,
            note
        });

        await inv.save();

        // Check for Low Stock Alert
        if (inv.availableStock <= inv.reorderLevel) {
            emitToCompany(req.user.company, 'LOW_STOCK_ALERT', {
                materialId: materialMasterId,
                message: `Low stock alert: ${inv.availableStock} units remaining.`
            });
        }

        res.json(inv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========================================
// MATERIAL REQUEST WORKFLOW
// ========================================

// @desc    Create a new material request (Site Engineer)
// @route   POST /api/materials/request
export const createRequest = async (req, res) => {
    try {
        const { materialMasterId, project, quantity, priority, purpose, remarks } = req.body;

        // ⚡ Generate Request ID in Controller to ensure it's present during validation
        const count = await MaterialRequest.countDocuments();
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const generatedId = `REQ-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;

        const request = await MaterialRequest.create({
            requestId: generatedId,
            materialMaster: materialMasterId,
            project,
            quantity,
            priority,
            purpose,
            remarks,
            requester: req.user._id,
            company: req.user.company,
            timeline: [{
                status: 'PENDING',
                performedBy: req.user._id,
                note: 'Request initiated by field engineer'
            }]
        });

        emitToCompany(req.user.company, 'MATERIAL_REQUEST_CREATED', {
            requestId: request.requestId,
            message: `New Material Request: ${quantity} units requested for project.`
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a request (Supervisor)
// @route   PUT /api/materials/request/:id/approve
export const approveRequest = async (req, res) => {
    try {
        const request = await MaterialRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'APPROVED';
        request.approver = req.user._id;
        request.timeline.push({
            status: 'APPROVED',
            performedBy: req.user._id,
            note: req.body.note || 'Supervisor approved the quantity'
        });

        await request.save();

        // ⚡ Reserve stock logic
        const inv = await Inventory.findOne({ materialMaster: request.materialMaster, company: request.company });
        if (inv) {
            inv.reservedStock += request.quantity;
            inv.availableStock -= request.quantity;
            await inv.save();
        }

        emitToCompany(request.company, 'MATERIAL_REQUEST_APPROVED', {
            requestId: request.requestId,
            message: `Request ${request.requestId} approved and stock reserved.`
        });

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Issue materials (Storekeeper)
// @route   PUT /api/materials/request/:id/issue
export const issueMaterials = async (req, res) => {
    try {
        const request = await MaterialRequest.findById(req.params.id);
        if (!request || request.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Request must be APPROVED before issuing' });
        }

        request.status = 'ISSUED';
        request.issuer = req.user._id;
        request.timeline.push({
            status: 'ISSUED',
            performedBy: req.user._id,
            note: 'Material physically issued to site team'
        });

        await request.save();

        // ⚡ Update inventory (Finalize distribution)
        const inv = await Inventory.findOne({ materialMaster: request.materialMaster, company: request.company });
        if (inv) {
            inv.reservedStock -= request.quantity;
            inv.totalStock -= request.quantity;
            inv.timeline.push({
                action: 'STOCK_ISSUE',
                quantity: request.quantity,
                performedBy: req.user.name,
                relatedProject: request.project
            });
            await inv.save();
        }

        emitToCompany(request.company, 'MATERIAL_ISSUED', {
            requestId: request.requestId,
            message: `Materials for ${request.requestId} have been issued.`
        });

        // ⚡ Auto-create expense entry in Finance
        await linkMaterialExpense(request._id, req.user._id, request.company);

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all requests
// @route   GET /api/materials/requests
export const getRequests = async (req, res) => {
    try {
        const requests = await MaterialRequest.find({ company: req.user.company })
            .populate('materialMaster', 'name itemCode unit')
            .populate('project', 'name')
            .populate('requester', 'name')
            .populate('approver', 'name')
            .populate('issuer', 'name')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========================================
// MATERIAL QUALITY VERIFICATION
// ========================================

// @desc    Verify material quality (from qualityController)
// @route   POST /api/materials/quality/verify
export const verifyMaterialQuality = async (req, res) => {
    try {
        const { materialMaster, batch, supplier, testCertificates, testDate, expiryDate, qualityStatus, inspectionDetails, photos, project } = req.body;

        const materialQuality = await MaterialQuality.create({
            materialMaster,
            batch,
            supplier,
            testCertificates,
            testDate,
            expiryDate,
            qualityStatus,
            inspectionDetails: {
                ...inspectionDetails,
                inspector: req.user._id,
                inspectionDate: new Date()
            },
            photos,
            project,
            company: req.user.company
        });

        if (qualityStatus === 'REJECTED') {
            emitToCompany(req.user.company, 'MATERIAL_REJECTED', {
                batchNumber: batch.batchNumber,
                material: materialMaster,
                message: `Material batch ${batch.batchNumber} REJECTED`
            });
        }

        res.status(201).json(materialQuality);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get material quality records
// @route   GET /api/materials/quality
export const getMaterialQuality = async (req, res) => {
    try {
        const { materialMaster, supplier, qualityStatus } = req.query;

        let filter = { company: req.user.company };
        if (materialMaster) filter.materialMaster = materialMaster;
        if (supplier) filter.supplier = supplier;
        if (qualityStatus) filter.qualityStatus = qualityStatus;

        const qualityRecords = await MaterialQuality.find(filter)
            .populate('materialMaster', 'name itemCode')
            .populate('supplier', 'name')
            .populate('inspectionDetails.inspector', 'name')
            .sort({ createdAt: -1 });

        res.json(qualityRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
