import DailyReport from '../../models/construction/dailyReport.js';
import Project from '../../models/construction/project.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Create a new daily report
// @route   POST /api/reports
// @access  Private
export const createReport = async (req, res) => {
    try {
        const {
            project,
            reportDate,
            siteMeta,
            weather,
            workDescription,
            activities,
            safety,
            attendance,
            resourceUsage,
            media,
            issues
        } = req.body;

        const report = await DailyReport.create({
            project,
            reportDate,
            siteMeta,
            weather,
            workDescription,
            activities,
            safety,
            attendance,
            resourceUsage,
            media,
            issues,
            company: req.user.company,
            createdBy: req.user._id
        });

        if (report) {
            // ⚡ WS: Notify about new report (SITE SUPERVISOR / PM)
            emitToCompany(req.user.company, 'REPORT_CREATED', {
                message: `DPR Published: ${report.siteMeta?.site || 'Main Site'} - ${new Date(report.reportDate).toLocaleDateString()}`,
                reportId: report._id,
                projectId: project
            });

            res.status(201).json(report);
        } else {
            res.status(400).json({ message: 'Invalid report data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve or Reject a report
// @route   PUT /api/reports/:id/approve
// @access  Private
export const approveReport = async (req, res) => {
    try {
        const { role, status, comments } = req.body;
        const report = await DailyReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Update the specific approval stage
        if (report.approvals[role]) {
            report.approvals[role] = {
                status,
                user: req.user._id,
                date: new Date(),
                comments
            };
        } else {
            return res.status(400).json({ message: 'Invalid approval role' });
        }

        const updatedReport = await report.save();

        // ⚡ WS: Notify about approval/rejection
        emitToCompany(req.user.company, 'REPORT_UPDATED', {
            message: `DPR ${status}: ${role} has ${status.toLowerCase()} the report for ${new Date(updatedReport.reportDate).toLocaleDateString()}`,
            reportId: updatedReport._id,
            status: status
        });

        res.json(updatedReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a comment to a report
// @route   POST /api/reports/:id/comments
// @access  Private
export const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const report = await DailyReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const comment = {
            user: req.user._id,
            text,
            createdAt: new Date()
        };

        report.comments.push(comment);
        await report.save();

        // ⚡ WS: Notify about new comment
        emitToCompany(req.user.company, 'NEW_COMMENT', {
            reportId: report._id,
            comment: {
                ...comment,
                userName: req.user.name
            }
        });

        res.status(201).json(report.comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get comparison stats (Yesterday vs Today vs Plan)
// @route   GET /api/reports/stats/:projectId
// @access  Private
export const getComparisonStats = async (req, res) => {
    try {
        const { projectId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const [reportToday, reportYesterday, project] = await Promise.all([
            DailyReport.findOne({ project: projectId, reportDate: { $gte: today } }),
            DailyReport.findOne({ project: projectId, reportDate: { $gte: yesterday, $lt: today } }),
            Project.findById(projectId)
        ]);

        // Calculate Variance / Alerts
        const alerts = [];
        if (project) {
            const todayProgress = reportToday?.activities?.reduce((acc, curr) => acc + curr.progressPercent, 0) / (reportToday?.activities?.length || 1);
            const yesterdayProgress = reportYesterday?.activities?.reduce((acc, curr) => acc + curr.progressPercent, 0) / (reportYesterday?.activities?.length || 1);

            if (todayProgress < (yesterdayProgress || 0)) {
                alerts.push({ type: 'PROGRESS_LAG', message: 'Reported progress is lower than previous record.' });
            }

            // Simple budget check simulation
            const totalMaterialQty = reportToday?.resourceUsage?.materials?.reduce((acc, curr) => acc + curr.qty, 0) || 0;
            if (totalMaterialQty > 100) { // Arbitrary threshold for demo
                alerts.push({ type: 'BUDGET_RISK', message: 'High material consumption detected today.' });
            }
        }

        res.json({
            today: reportToday,
            yesterday: reportYesterday,
            project,
            alerts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reports for a company or specific project
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
    try {
        const query = { company: req.user.company };
        if (req.query.projectId) {
            query.project = req.query.projectId;
        }

        const reports = await DailyReport.find(query)
            .sort({ reportDate: -1 })
            .populate('createdBy', 'name')
            .populate('project', 'name');

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
