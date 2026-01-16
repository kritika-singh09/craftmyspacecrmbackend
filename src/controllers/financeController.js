import Transaction from '../models/transaction.js';
import PaymentRequest from '../models/paymentRequest.js';
import Project from '../models/construction/project.js';
import { MaterialRequest } from '../models/construction/material.js';
import Inventory from '../models/construction/inventory.js';
import { emitToCompany } from '../config/socket.js';

// @desc    Create a new financial transaction
// @route   POST /api/finance/transaction
export const createTransaction = async (req, res) => {
    try {
        const { type, category, amount, project, boqItem, vendor, gst, paymentMode, referenceId, attachments, description } = req.body;

        const transaction = await Transaction.create({
            type,
            category,
            amount,
            project,
            boqItem,
            vendor,
            gst,
            paymentMode,
            referenceId,
            attachments,
            description,
            company: req.user.company,
            timeline: [{
                status: 'PENDING',
                performedBy: req.user._id,
                note: 'Transaction initiated'
            }]
        });

        // Update project actualSpend if EXPENSE
        if (type === 'EXPENSE') {
            await Project.findByIdAndUpdate(project, {
                $inc: { actualSpend: amount }
            });
        }

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auto-create expense when material is issued
// @route   Called internally from requestController
export const linkMaterialExpense = async (materialRequestId, userId, companyId) => {
    try {
        const request = await MaterialRequest.findById(materialRequestId)
            .populate('materialMaster')
            .populate('project');

        if (!request) return;

        // Fetch material cost from inventory
        const inv = await Inventory.findOne({
            materialMaster: request.materialMaster._id,
            company: companyId
        });

        // Calculate cost (using latest batch or default rate)
        let unitCost = 0;
        if (inv && inv.batchInfo.length > 0) {
            const latestBatch = inv.batchInfo[inv.batchInfo.length - 1];
            unitCost = latestBatch.unitCost || 0;
        }

        const totalCost = request.quantity * unitCost;

        if (totalCost > 0) {
            await Transaction.create({
                type: 'EXPENSE',
                category: 'Material',
                amount: totalCost,
                project: request.project._id,
                materialRequest: materialRequestId,
                description: `Auto-expense: ${request.quantity} ${request.materialMaster.unit} of ${request.materialMaster.name} issued`,
                company: companyId,
                status: 'APPROVED',
                timeline: [{
                    status: 'APPROVED',
                    performedBy: userId,
                    note: 'Auto-generated from material issue'
                }]
            });

            // Update project actualSpend
            await Project.findByIdAndUpdate(request.project._id, {
                $inc: { actualSpend: totalCost }
            });
        }
    } catch (error) {
        console.error('Auto-expense creation failed:', error);
    }
};

// @desc    Get all transactions
// @route   GET /api/finance/transactions
export const getTransactions = async (req, res) => {
    try {
        const { project, category, type, startDate, endDate } = req.query;

        let filter = { company: req.user.company };
        if (project) filter.project = project;
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter)
            .populate('project', 'name')
            .populate('vendor', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a transaction
// @route   PUT /api/finance/transaction/:id/approve
export const approveTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        transaction.status = 'APPROVED';
        transaction.approvedBy = req.user._id;
        transaction.timeline.push({
            status: 'APPROVED',
            performedBy: req.user._id,
            note: req.body.note || 'Transaction approved'
        });

        await transaction.save();
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get budget health for a project
// @route   GET /api/finance/budget-health/:projectId
export const getBudgetHealth = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const totalBudget = project.approvedBudget + project.revisedBudget + project.contingencyFund;
        const availableBudget = totalBudget - project.actualSpend - project.lockedAmount;
        const utilizationPercent = ((project.actualSpend / totalBudget) * 100).toFixed(2);

        // Cost vs Progress variance
        const variance = project.progress - utilizationPercent;
        let healthStatus = 'GREEN';
        if (utilizationPercent > project.progress + 10) healthStatus = 'RED';
        else if (utilizationPercent > project.progress + 5) healthStatus = 'YELLOW';

        // Check for budget overrun alert
        if (utilizationPercent > 90) {
            emitToCompany(req.user.company, 'BUDGET_ALERT', {
                projectId: project._id,
                projectName: project.name,
                message: `Budget utilization at ${utilizationPercent}%!`
            });
        }

        res.json({
            project: { _id: project._id, name: project.name },
            totalBudget,
            approvedBudget: project.approvedBudget,
            revisedBudget: project.revisedBudget,
            contingencyFund: project.contingencyFund,
            actualSpend: project.actualSpend,
            lockedAmount: project.lockedAmount,
            availableBudget,
            utilizationPercent,
            progress: project.progress,
            variance,
            healthStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get 30-day cash flow forecast
// @route   GET /api/finance/cash-flow
export const getCashFlowForecast = async (req, res) => {
    try {
        const today = new Date();
        const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Expected outflows (pending payment requests)
        const pendingPayments = await PaymentRequest.find({
            company: req.user.company,
            status: { $in: ['PENDING', 'VERIFIED'] }
        }).populate('project', 'name');

        const totalOutflow = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        // Expected inflows (client milestone payments - would need a separate model)
        // For now, returning structure
        const forecast = {
            period: '30 Days',
            expectedOutflow: totalOutflow,
            expectedInflow: 0, // TODO: Implement client payment milestones
            netPosition: 0 - totalOutflow,
            pendingPayments: pendingPayments.length
        };

        res.json(forecast);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
