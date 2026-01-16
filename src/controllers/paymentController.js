import PaymentRequest from '../models/paymentRequest.js';
import Transaction from '../models/transaction.js';
import Project from '../models/construction/project.js';
import { emitToCompany } from '../config/socket.js';

// @desc    Create a payment request
// @route   POST /api/finance/payment-request
export const createPaymentRequest = async (req, res) => {
    try {
        const { vendor, project, amount, purpose, category, advance, retention, invoiceDetails } = req.body;

        const paymentRequest = await PaymentRequest.create({
            vendor,
            project,
            amount,
            purpose,
            category,
            advance,
            retention,
            invoiceDetails,
            requestedBy: req.user._id,
            company: req.user.company,
            timeline: [{
                status: 'PENDING',
                performedBy: req.user._id,
                note: 'Payment request initiated'
            }]
        });

        // Lock the amount in project budget
        await Project.findByIdAndUpdate(project, {
            $inc: { lockedAmount: amount }
        });

        emitToCompany(req.user.company, 'PAYMENT_REQUEST_CREATED', {
            requestId: paymentRequest.requestId,
            amount,
            message: `New payment request for ₹${amount.toLocaleString()}`
        });

        res.status(201).json(paymentRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify a payment request (Accounts team)
// @route   PUT /api/finance/payment-request/:id/verify
export const verifyPaymentRequest = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(req.params.id);
        if (!paymentRequest) return res.status(404).json({ message: 'Payment request not found' });

        paymentRequest.status = 'VERIFIED';
        paymentRequest.verifiedBy = req.user._id;
        paymentRequest.timeline.push({
            status: 'VERIFIED',
            performedBy: req.user._id,
            note: req.body.note || 'Payment request verified by accounts'
        });

        await paymentRequest.save();

        emitToCompany(paymentRequest.company, 'PAYMENT_VERIFIED', {
            requestId: paymentRequest.requestId,
            message: `Payment ${paymentRequest.requestId} verified and awaiting release`
        });

        res.json(paymentRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Release payment (Admin/Finance head)
// @route   PUT /api/finance/payment-request/:id/release
export const releasePayment = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(req.params.id);
        if (!paymentRequest || paymentRequest.status !== 'VERIFIED') {
            return res.status(400).json({ message: 'Payment must be VERIFIED before release' });
        }

        const { paymentMode, referenceId } = req.body;

        paymentRequest.status = 'RELEASED';
        paymentRequest.releasedBy = req.user._id;
        paymentRequest.paymentDetails = {
            mode: paymentMode,
            referenceId,
            paidDate: new Date()
        };
        paymentRequest.timeline.push({
            status: 'RELEASED',
            performedBy: req.user._id,
            note: 'Payment released to vendor'
        });

        await paymentRequest.save();

        // Create transaction entry
        await Transaction.create({
            type: 'EXPENSE',
            category: paymentRequest.category,
            amount: paymentRequest.amount,
            project: paymentRequest.project,
            vendor: paymentRequest.vendor,
            paymentMode,
            referenceId,
            description: paymentRequest.purpose,
            status: 'APPROVED',
            approvedBy: req.user._id,
            company: paymentRequest.company,
            timeline: [{
                status: 'APPROVED',
                performedBy: req.user._id,
                note: `Auto-generated from payment request ${paymentRequest.requestId}`
            }]
        });

        // Update project: unlock and add to actualSpend
        await Project.findByIdAndUpdate(paymentRequest.project, {
            $inc: {
                lockedAmount: -paymentRequest.amount,
                actualSpend: paymentRequest.amount
            }
        });

        emitToCompany(paymentRequest.company, 'PAYMENT_RELEASED', {
            requestId: paymentRequest.requestId,
            amount: paymentRequest.amount,
            message: `Payment ${paymentRequest.requestId} released successfully`
        });

        res.json(paymentRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payment requests
// @route   GET /api/finance/payment-requests
export const getPaymentRequests = async (req, res) => {
    try {
        const { status, project } = req.query;

        let filter = { company: req.user.company };
        if (status) filter.status = status;
        if (project) filter.project = project;

        const requests = await PaymentRequest.find(filter)
            .populate('vendor', 'name')
            .populate('project', 'name')
            .populate('requestedBy', 'name')
            .populate('verifiedBy', 'name')
            .populate('releasedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject a payment request
// @route   PUT /api/finance/payment-request/:id/reject
export const rejectPaymentRequest = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(req.params.id);
        if (!paymentRequest) return res.status(404).json({ message: 'Payment request not found' });

        paymentRequest.status = 'REJECTED';
        paymentRequest.timeline.push({
            status: 'REJECTED',
            performedBy: req.user._id,
            note: req.body.reason || 'Payment request rejected'
        });

        await paymentRequest.save();

        // Unlock the amount in project budget
        await Project.findByIdAndUpdate(paymentRequest.project, {
            $inc: { lockedAmount: -paymentRequest.amount }
        });

        res.json(paymentRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
