import SafetyPolicy from '../models/Safety/SafetyPolicy.js';
import PPEItem from '../models/Safety/PPEItem.js';
import SafetyChecklist from '../models/Safety/SafetyChecklist.js';
import IncidentReport from '../models/Safety/IncidentReport.js';
import SafetyTraining from '../models/Safety/SafetyTraining.js';
import { getIO } from '../config/socket.js';
import { uploadToCloudinary } from '../middlewares/uploadMiddleware.js';

// --- Policies ---
export const getPolicies = async (req, res) => {
    try {
        const policies = await SafetyPolicy.find({ company: req.user.company });
        res.status(200).json(policies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPolicy = async (req, res) => {
    try {
        const policy = new SafetyPolicy({ ...req.body, company: req.user.company });
        await policy.save();
        res.status(201).json(policy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- PPE Management ---
export const getPPEInventory = async (req, res) => {
    try {
        const inventory = await PPEItem.find({ company: req.user.company });
        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addPPEItem = async (req, res) => {
    try {
        const item = new PPEItem({ ...req.body, company: req.user.company });
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Issue PPE (Reduce stock)
export const issuePPE = async (req, res) => {
    try {
        const { itemId, quantity, issuedTo } = req.body; // issuedTo could be worker ID or name
        const item = await PPEItem.findById(itemId);

        if (!item) return res.status(404).json({ message: "PPE Item not found" });
        if (item.availableQuantity < quantity) return res.status(400).json({ message: "Insufficient stock" });

        item.issuedQuantity += Number(quantity);
        await item.save();

        if (item.availableQuantity <= item.lowStockThreshold) {
            getIO().to(`company_${req.user.company}`).emit("PPE_LOW_STOCK", {
                message: `Low Stock Alert: ${item.name}`,
                item: item
            });
        }

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Checklists ---
export const submitChecklist = async (req, res) => {
    try {
        const photoUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadToCloudinary(file.buffer);
                photoUrls.push(url);
            }
        }

        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        const checklist = new SafetyChecklist({
            ...data,
            photos: photoUrls,
            company: req.user.company,
            submittedBy: req.user._id
        });
        await checklist.save();

        // Check for "Unsafe" items
        const unsafeItems = checklist.items.filter(i => i.status === 'Unsafe');
        const alertLevel = unsafeItems.length > 0 ? 'WARNING' : 'INFO';

        getIO().to(`company_${req.user.company}`).emit("SAFETY_CHECKLIST_SUBMITTED", {
            project: checklist.project,
            submittedBy: req.user.name,
            alertLevel,
            unsafeQuery: unsafeItems.length
        });

        if (checklist.riskLevel === 'High') {
            getIO().to(`company_${req.user.company}`).emit("SAFETY_VIOLATION_CRITICAL", {
                message: `High Risk Checklist Submitted for Project ${checklist.project}`,
                checklistId: checklist._id
            });
        }

        res.status(201).json(checklist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getChecklists = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { company: req.user.company };
        if (projectId) query.project = projectId;

        const checklists = await SafetyChecklist.find(query).populate('submittedBy', 'name').sort({ date: -1 });
        res.status(200).json(checklists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Incidents ---
export const reportIncident = async (req, res) => {
    try {
        const photoUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadToCloudinary(file.buffer);
                photoUrls.push(url);
            }
        }

        const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        const incident = new IncidentReport({
            ...data,
            photos: photoUrls,
            company: req.user.company,
            reportedBy: req.user._id
        });
        await incident.save();

        // Emit Critical Alert if severity is Critical
        if (incident.severity === 'Critical') {
            getIO().to(`company_${req.user.company}`).emit("SAFETY_VIOLATION_CRITICAL", {
                message: `CRITICAL INCIDENT REPORTED: ${incident.type}`,
                project: incident.project,
                incidentId: incident._id
            });
            // Also emit WORK STOP logic if needed
            if (incident.type === 'Injury' || incident.type === 'Fire') {
                getIO().to(`project_${incident.project}`).emit("WORK_STOP_ISSUED", {
                    reason: `Critical Safety Incident: ${incident.type}`,
                    incidentId: incident._id
                });
            }
        } else {
            getIO().to(`company_${req.user.company}`).emit("INCIDENT_REPORTED", {
                message: `Incident Reported: ${incident.type}`,
                severity: incident.severity,
                project: incident.project
            });
        }

        res.status(201).json(incident);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getIncidents = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { company: req.user.company };
        if (projectId) query.project = projectId;

        const incidents = await IncidentReport.find(query)
            .populate('reportedBy', 'name')
            .populate('project', 'name') // Assuming Project model has name
            .sort({ date: -1 });
        res.status(200).json(incidents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Training ---
export const addTrainingRecord = async (req, res) => {
    try {
        const record = new SafetyTraining({ ...req.body, company: req.user.company });
        await record.save();
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getTrainingRecords = async (req, res) => {
    try {
        const records = await SafetyTraining.find({ company: req.user.company }).sort({ expiryDate: 1 });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Dashboard (Simple Stats) ---
export const getSafetyStats = async (req, res) => {
    try {
        // This is a placeholder for more complex aggregation
        // 1. Total Incidents this month
        // 2. Pending Critical Incidents
        // 3. PPE Low Stock Count
        const companyId = req.user.company;

        const openIncidents = await IncidentReport.countDocuments({ company: companyId, status: { $ne: 'Closed' } });
        const criticalIncidents = await IncidentReport.countDocuments({ company: companyId, severity: 'Critical', status: { $ne: 'Closed' } });

        // PPE Low Stock (could be done via aggregation or simple filter)
        // Here we just count items where available <= threshold
        // MongoDB doesn't support direct field comparison in simple find without $expr, but let's do simple iterate or $where if needed.
        // Better: let's query all and filter in JS for now or use $expr
        const lowStockItems = await PPEItem.countDocuments({
            company: companyId,
            $expr: { $lte: ["$availableQuantity", "$lowStockThreshold"] }
        });

        res.status(200).json({
            openIncidents,
            criticalIncidents,
            lowStockItems,
            safetyScore: 100 - (criticalIncidents * 10) - (openIncidents * 2) // Dummy logic
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
