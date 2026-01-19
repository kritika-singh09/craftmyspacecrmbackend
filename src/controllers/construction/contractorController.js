import Contractor from '../../models/construction/Contractor.js';

// @desc    Register new contractor
// @route   POST /api/construction/contractors
// @access  Private
export const createContractor = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        const exists = await Contractor.findOne({
            $or: [{ email }, { phone }],
            company: req.user.company
        });

        if (exists) {
            return res.status(400).json({ message: 'Contractor with this email or phone already exists' });
        }

        const contractor = await Contractor.create({
            ...req.body,
            company: req.user.company,
            createdBy: req.user._id
        });

        res.status(201).json(contractor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all contractors
// @route   GET /api/construction/contractors
// @access  Private
// @query   type, specialization, status
export const getContractors = async (req, res) => {
    try {
        const { type, specialization, status } = req.query;
        let query = { company: req.user.company };

        if (type) query.type = type;
        if (specialization) query.specialization = specialization;
        if (status) query['skills.status'] = status;

        const contractors = await Contractor.find(query)
            .sort({ createdAt: -1 });

        // Augment with active project count
        const augmented = contractors.map(c => {
            const activeProjects = c.workOrders.filter(wo => wo.status === 'Active').length;
            return {
                ...c.toObject(),
                activeProjectsCount: activeProjects
            };
        });

        res.json(augmented);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get contractor details
// @route   GET /api/construction/contractors/:id
// @access  Private
export const getContractorById = async (req, res) => {
    try {
        const contractor = await Contractor.findById(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'Contractor not found' });
        }

        if (contractor.company.toString() !== req.user.company.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(contractor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update contractor
// @route   PUT /api/construction/contractors/:id
// @access  Private
export const updateContractor = async (req, res) => {
    try {
        const contractor = await Contractor.findById(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'Contractor not found' });
        }

        // Logic to push new Work Order if provided in body.workOrder
        // This is a simplified way to add work orders via update
        if (req.body.newWorkOrder) {
            contractor.workOrders.push(req.body.newWorkOrder);
            delete req.body.newWorkOrder; // Remove so it doesn't conflict with direct set
        }

        Object.assign(contractor, req.body);

        await contractor.save();
        res.json(contractor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete contractor
// @route   DELETE /api/construction/contractors/:id
// @access  Private
export const deleteContractor = async (req, res) => {
    try {
        const contractor = await Contractor.findById(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'Contractor not found' });
        }

        await contractor.deleteOne();
        res.json({ message: 'Contractor removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
