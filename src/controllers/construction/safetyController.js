import { SafetyIncident, SafetyChecklist, SafetyCertification } from '../../models/construction/safety.js';
import { RiskScore } from '../../models/construction/compliance.js';
import Project from '../../models/construction/project.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Report a safety incident
// @route   POST /api/safety/incident
export const reportIncident = async (req, res) => {
    try {
        const { type, severity, project, location, description, photos, videos, witnesses, immediateAction } = req.body;

        const incident = await SafetyIncident.create({
            type,
            severity,
            project,
            location,
            description,
            photos,
            videos,
            witnesses,
            immediateAction,
            reportedBy: req.user._id,
            company: req.user.company,
            timeline: [{
                status: 'OPEN',
                performedBy: req.user._id,
                note: 'Incident reported'
            }]
        });

        // Update risk score
        await updateProjectRiskScore(project, req.user.company);

        // Critical incidents trigger work stoppage alert
        if (severity === 'CRITICAL') {
            emitToCompany(req.user.company, 'CRITICAL_SAFETY_INCIDENT', {
                incidentId: incident.incidentId,
                project: project,
                message: `CRITICAL INCIDENT: ${type} - Immediate action required!`
            });
        } else {
            emitToCompany(req.user.company, 'SAFETY_INCIDENT_REPORTED', {
                incidentId: incident.incidentId,
                severity,
                message: `New ${severity} safety incident reported`
            });
        }

        res.status(201).json(incident);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create daily safety checklist
// @route   POST /api/safety/checklist
export const createChecklist = async (req, res) => {
    try {
        const { project, ppeCompliance, workAtHeight, electricalSafety, scaffoldingInspection, toolCondition, overallStatus, remarks, photos } = req.body;

        const checklist = await SafetyChecklist.create({
            project,
            inspector: req.user._id,
            ppeCompliance,
            workAtHeight,
            electricalSafety,
            scaffoldingInspection,
            toolCondition,
            overallStatus,
            remarks,
            photos,
            company: req.user.company
        });

        // Alert if major issues found
        if (overallStatus === 'MAJOR_ISSUES' || overallStatus === 'UNSAFE') {
            emitToCompany(req.user.company, 'SAFETY_VIOLATION', {
                project,
                status: overallStatus,
                message: `Safety inspection flagged as ${overallStatus}`
            });
        }

        res.status(201).json(checklist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get worker certifications
// @route   GET /api/safety/certifications/:workerId
export const getWorkerCertifications = async (req, res) => {
    try {
        const certifications = await SafetyCertification.find({
            worker: req.params.workerId,
            company: req.user.company
        }).populate('worker', 'name email');

        res.json(certifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if worker is safe to work (no expired certs)
// @route   GET /api/safety/worker-status/:workerId
export const checkWorkerSafetyStatus = async (req, res) => {
    try {
        const expiredCerts = await SafetyCertification.find({
            worker: req.params.workerId,
            company: req.user.company,
            status: 'EXPIRED'
        });

        const isSafe = expiredCerts.length === 0;

        res.json({
            workerId: req.params.workerId,
            isSafe,
            expiredCertifications: expiredCerts.length,
            message: isSafe ? 'Worker cleared for site access' : 'Worker has expired safety certifications - BLOCKED'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all safety incidents
// @route   GET /api/safety/incidents
export const getIncidents = async (req, res) => {
    try {
        const { project, severity, status } = req.query;

        let filter = { company: req.user.company };
        if (project) filter.project = project;
        if (severity) filter.severity = severity;
        if (status) filter.status = status;

        const incidents = await SafetyIncident.find(filter)
            .populate('project', 'name')
            .populate('reportedBy', 'name')
            .populate('correctiveAction.assignedTo', 'name')
            .sort({ createdAt: -1 });

        res.json(incidents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to update project risk score
const updateProjectRiskScore = async (projectId, companyId) => {
    try {
        // Get incident metrics
        const incidents = await SafetyIncident.find({ project: projectId, company: companyId });
        const incidentCount = incidents.length;

        // Calculate average severity (LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4)
        const severityMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        const avgSeverity = incidentCount > 0
            ? incidents.reduce((sum, inc) => sum + severityMap[inc.severity], 0) / incidentCount
            : 0;

        // Calculate frequency (incidents per month)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentIncidents = incidents.filter(inc => inc.createdAt >= thirtyDaysAgo);
        const frequency = recentIncidents.length;

        // Update or create risk score
        let riskScore = await RiskScore.findOne({ project: projectId });
        if (!riskScore) {
            riskScore = new RiskScore({ project: projectId, company: companyId });
        }

        riskScore.safetyMetrics = {
            incidentCount,
            avgSeverity,
            frequency,
            lastIncidentDate: incidents.length > 0 ? incidents[0].createdAt : null
        };

        riskScore.calculateRiskScore();
        await riskScore.save();

        return riskScore;
    } catch (error) {
        console.error('Risk score update failed:', error);
    }
};
