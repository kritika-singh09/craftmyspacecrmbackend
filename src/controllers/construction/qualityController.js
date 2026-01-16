import { QualityInspection, SnagDefect } from '../../models/construction/quality.js';
import { MaterialQuality } from '../../models/construction/material.js';
import { RiskScore } from '../../models/construction/compliance.js';
import Transaction from '../../models/transaction.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Create quality inspection
// @route   POST /api/quality/inspection
export const createInspection = async (req, res) => {
    try {
        const { project, activity, checklist, overallStatus, boqItem, remarks, failureReason, photos } = req.body;

        const inspection = await QualityInspection.create({
            project,
            activity,
            checklist,
            overallStatus,
            inspector: req.user._id,
            boqItem,
            remarks,
            failureReason,
            photos,
            company: req.user.company,
            timeline: [{
                status: overallStatus,
                performedBy: req.user._id,
                note: `Inspection ${overallStatus}`
            }]
        });

        // If inspection fails, auto-create a snag
        if (overallStatus === 'FAIL') {
            await SnagDefect.create({
                project,
                defectType: activity,
                priority: 'HIGH',
                description: `Failed quality inspection: ${failureReason || remarks}`,
                location: `${activity} area`,
                targetResolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                assignedTo: req.user._id,
                company: req.user.company,
                timeline: [{
                    status: 'OPEN',
                    performedBy: req.user._id,
                    note: `Auto-created from failed inspection ${inspection.inspectionId}`
                }]
            });

            // Update risk score
            await updateQualityRiskScore(project, req.user.company);

            emitToCompany(req.user.company, 'QUALITY_INSPECTION_FAILED', {
                inspectionId: inspection.inspectionId,
                activity,
                message: `Quality inspection FAILED for ${activity}`
            });
        }

        res.status(201).json(inspection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report a snag/defect
// @route   POST /api/quality/snag
export const reportSnag = async (req, res) => {
    try {
        const { project, defectType, priority, contractor, description, location, photos, targetResolutionDate } = req.body;

        const snag = await SnagDefect.create({
            project,
            defectType,
            priority,
            contractor,
            description,
            location,
            photos,
            targetResolutionDate,
            assignedTo: req.user._id,
            company: req.user.company,
            timeline: [{
                status: 'OPEN',
                performedBy: req.user._id,
                note: 'Snag reported'
            }]
        });

        emitToCompany(req.user.company, 'SNAG_REPORTED', {
            snagId: snag.snagId,
            priority,
            message: `New ${priority} priority snag reported`
        });

        res.status(201).json(snag);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update snag status (OPEN → FIXED → VERIFIED → CLOSED)
// @route   PUT /api/quality/snag/:id/status
export const updateSnagStatus = async (req, res) => {
    try {
        const { status, note, photos, reworkCost } = req.body;

        const snag = await SnagDefect.findById(req.params.id);
        if (!snag) return res.status(404).json({ message: 'Snag not found' });

        snag.status = status;
        if (status === 'VERIFIED') snag.verifiedBy = req.user._id;
        if (status === 'CLOSED') snag.actualResolutionDate = new Date();
        if (reworkCost) snag.reworkCost = reworkCost;

        snag.timeline.push({
            status,
            performedBy: req.user._id,
            note,
            photos
        });

        await snag.save();

        // If rework cost is added, create expense in Finance
        if (reworkCost && reworkCost > 0) {
            await Transaction.create({
                type: 'EXPENSE',
                category: 'Overheads',
                amount: reworkCost,
                project: snag.project,
                vendor: snag.contractor,
                description: `Rework cost for snag ${snag.snagId}: ${snag.description}`,
                company: snag.company,
                status: 'APPROVED',
                timeline: [{
                    status: 'APPROVED',
                    performedBy: req.user._id,
                    note: 'Auto-generated from snag rework'
                }]
            });
        }

        res.json(snag);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify material quality
// @route   POST /api/quality/material-verify
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

// @desc    Get all snags
// @route   GET /api/quality/snags
export const getSnags = async (req, res) => {
    try {
        const { project, status, priority } = req.query;

        let filter = { company: req.user.company };
        if (project) filter.project = project;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const snags = await SnagDefect.find(filter)
            .populate('project', 'name')
            .populate('contractor', 'name')
            .populate('assignedTo', 'name')
            .populate('verifiedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(snags);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get quality metrics for a project
// @route   GET /api/quality/metrics/:projectId
export const getQualityMetrics = async (req, res) => {
    try {
        const projectId = req.params.projectId;

        const [inspections, snags] = await Promise.all([
            QualityInspection.find({ project: projectId, company: req.user.company }),
            SnagDefect.find({ project: projectId, company: req.user.company })
        ]);

        const failedInspections = inspections.filter(i => i.overallStatus === 'FAIL').length;
        const totalReworkCost = snags.reduce((sum, s) => sum + (s.reworkCost || 0), 0);
        const openSnags = snags.filter(s => s.status === 'OPEN').length;

        res.json({
            totalInspections: inspections.length,
            failedInspections,
            passRate: inspections.length > 0 ? ((inspections.length - failedInspections) / inspections.length * 100).toFixed(2) : 0,
            totalSnags: snags.length,
            openSnags,
            totalReworkCost
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to update quality risk score
const updateQualityRiskScore = async (projectId, companyId) => {
    try {
        const [inspections, snags] = await Promise.all([
            QualityInspection.find({ project: projectId, company: companyId }),
            SnagDefect.find({ project: projectId, company: companyId })
        ]);

        const failedInspections = inspections.filter(i => i.overallStatus === 'FAIL').length;
        const defectCount = snags.length;
        const reworkCost = snags.reduce((sum, s) => sum + (s.reworkCost || 0), 0);

        let riskScore = await RiskScore.findOne({ project: projectId });
        if (!riskScore) {
            riskScore = new RiskScore({ project: projectId, company: companyId });
        }

        riskScore.qualityMetrics = {
            defectCount,
            failedInspections,
            reworkCost
        };

        riskScore.calculateRiskScore();
        await riskScore.save();

        return riskScore;
    } catch (error) {
        console.error('Quality risk score update failed:', error);
    }
};
