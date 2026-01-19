import Client from '../../models/construction/Client.js';
import Project from '../../models/construction/project.js';

// @desc    Create a new client
// @route   POST /api/construction/clients
// @access  Private
export const createClient = async (req, res) => {
    try {
        const { name, authorizedContact, phone, email, type } = req.body;

        // Check if client exists
        const clientExists = await Client.findOne({
            $or: [{ email }, { name }],
            company: req.user.company
        });

        if (clientExists) {
            return res.status(400).json({ message: 'Client with this name or email already exists' });
        }

        const client = await Client.create({
            ...req.body,
            company: req.user.company,
            createdBy: req.user._id
        });

        res.status(201).json(client);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all clients
// @route   GET /api/construction/clients
// @access  Private
export const getClients = async (req, res) => {
    try {
        const clients = await Client.find({ company: req.user.company })
            .sort({ createdAt: -1 });

        // Optimize: Fetch all project counts in a single aggregation
        const projectCounts = await Project.aggregate([
            { $match: { company: req.user.company } },
            { $group: { _id: "$client", count: { $sum: 1 } } }
        ]);

        const countMap = projectCounts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const clientsWithProjectCounts = clients.map(client => ({
            ...client.toObject(),
            projectCount: countMap[client.name] || 0
        }));

        res.json(clientsWithProjectCounts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get client by ID
// @route   GET /api/construction/clients/:id
// @access  Private
export const getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Verify company access
        if (client.company.toString() !== req.user.company.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Find associated projects
        // Note: Project model uses 'client' string name. Finding match by name.
        const projects = await Project.find({
            client: client.name,
            company: req.user.company
        }).select('name status budget start_date progress');

        // Calculate total contract value from projects
        const totalProjectValue = projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);

        const clientObj = client.toObject();
        clientObj.projects = projects;
        clientObj.computedStats = {
            totalContractValue: totalProjectValue,
            activeProjects: projects.filter(p => !['Completed', 'Cancelled'].includes(p.status)).length,
            completedProjects: projects.filter(p => p.status === 'Completed').length
        };

        res.json(clientObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update client
// @route   PUT /api/construction/clients/:id
// @access  Private
export const updateClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        if (client.company.toString() !== req.user.company.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const updatedClient = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(updatedClient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete client
// @route   DELETE /api/construction/clients/:id
// @access  Private
export const deleteClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        if (client.company.toString() !== req.user.company.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await client.deleteOne();
        res.json({ message: 'Client removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
