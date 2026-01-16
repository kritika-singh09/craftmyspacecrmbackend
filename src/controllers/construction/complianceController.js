import { ComplianceTracker, RiskScore } from '../../models/construction/compliance.js';
import Project from '../../models/construction/project.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Track compliance document
// @route   POST /api/compliance/track
export const trackCompliance = async (req, res) => {
    try {
        const { project, complianceType, issueDate, expiryDate, issuingAuthority, documentUrl, notes } = req.body;

        const compliance = await ComplianceTracker.create({
            project,
            complianceType,
            issueDate,
            expiryDate,
            issuingAuthority,
            documentUrl,
            notes,
            company: req.user.company
        });

        // Update risk score
        await updateComplianceRiskScore(project, req.user.company);

        res.status(201).json(compliance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get expiring compliance documents
// @route   GET /api/compliance/expiring
export const getExpiringCompliance = async (req, res) => {
    try {
        const { days = 60 } = req.query;
        const futureDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

        const expiringDocs = await ComplianceTracker.find({
            company: req.user.company,
            expiryDate: { $lte: futureDate, $gte: new Date() },
            status: { $in: ['VALID', 'EXPIRING_SOON'] }
        }).populate('project', 'name');

        res.json(expiringDocs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all compliance documents
// @route   GET /api/compliance/documents
export const getComplianceDocuments = async (req, res) => {
    try {
        const { project, status } = req.query;

        let filter = { company: req.user.company };
        if (project) filter.project = project;
        if (status) filter.status = status;

        const documents = await ComplianceTracker.find(filter)
            .populate('project', 'name')
            .sort({ expiryDate: 1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get project risk score
// @route   GET /api/compliance/risk-score/:projectId
export const getProjectRiskScore = async (req, res) => {
    try {
        let riskScore = await RiskScore.findOne({
            project: req.params.projectId,
            company: req.user.company
        }).populate('project', 'name');

        if (!riskScore) {
            // Create initial risk score
            riskScore = await RiskScore.create({
                project: req.params.projectId,
                company: req.user.company
            });
            riskScore.calculateRiskScore();
            await riskScore.save();
        }

        res.json(riskScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all project risk scores
// @route   GET /api/compliance/risk-scores
export const getAllRiskScores = async (req, res) => {
    try {
        const riskScores = await RiskScore.find({ company: req.user.company })
            .populate('project', 'name')
            .sort({ riskScore: -1 });

        res.json(riskScores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send compliance expiry alerts
// @route   POST /api/compliance/send-alerts
export const sendComplianceAlerts = async (req, res) => {
    try {
        const expiringDocs = await ComplianceTracker.find({
            company: req.user.company,
            status: 'EXPIRING_SOON'
        }).populate('project', 'name');

        for (const doc of expiringDocs) {
            const daysToExpiry = Math.floor((doc.expiryDate - new Date()) / (1000 * 60 * 60 * 24));

            emitToCompany(req.user.company, 'COMPLIANCE_EXPIRING', {
                complianceType: doc.complianceType,
                project: doc.project.name,
                daysToExpiry,
                message: `${doc.complianceType} expires in ${daysToExpiry} days for ${doc.project.name}`
            });

            // Update last reminder sent
            doc.renewalReminder.lastReminderSent = new Date();
            await doc.save();
        }

        res.json({ message: `Sent ${expiringDocs.length} compliance alerts` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to update compliance risk score
const updateComplianceRiskScore = async (projectId, companyId) => {
    try {
        const complianceDocs = await ComplianceTracker.find({ project: projectId, company: companyId });

        const expiredDocuments = complianceDocs.filter(doc => doc.status === 'EXPIRED').length;
        const pendingRenewals = complianceDocs.filter(doc => doc.status === 'EXPIRING_SOON').length;

        let riskScore = await RiskScore.findOne({ project: projectId });
        if (!riskScore) {
            riskScore = new RiskScore({ project: projectId, company: companyId });
        }

        riskScore.complianceMetrics = {
            expiredDocuments,
            pendingRenewals
        };

        riskScore.calculateRiskScore();
        await riskScore.save();

        // Alert if compliance risk is high
        if (expiredDocuments > 0) {
            emitToCompany(companyId, 'COMPLIANCE_RISK_HIGH', {
                projectId,
                expiredCount: expiredDocuments,
                message: `${expiredDocuments} compliance documents expired!`
            });
        }

        return riskScore;
    } catch (error) {
        console.error('Compliance risk score update failed:', error);
    }
};
