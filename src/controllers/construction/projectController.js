import Project from '../../models/construction/project.js';
import { emitToCompany } from '../../config/socket.js'; // ⚡ WS: Socket utility

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
    try {
        const { name, location, client, budget, start_date, end_date, status, progress, projectLead, description, modules, teamMembers } = req.body;

        // Auto-generate Project Code
        const projectCount = await Project.countDocuments({ company: req.user.company });
        const year = new Date().getFullYear();
        const projectCode = `PRJ-${year}-${(projectCount + 1).toString().padStart(3, '0')}`;

        const project = await Project.create({
            name,
            location,
            client,
            budget,
            start_date,
            end_date,
            status,
            progress: progress || 0,
            company: req.user.company,
            createdBy: req.user._id,
            projectCode,
            projectLead,
            description,
            modules,
            teamMembers,
            statusHistory: [{ status: status || 'Planning', date: new Date() }]
        });

        if (project) {
            emitToCompany(req.user.company, 'PROJECT_CREATED', {
                message: `New Project: ${project.name} (${projectCode})`,
                projectId: project._id,
                createdBy: req.user.name
            });

            res.status(201).json(project);
        } else {
            res.status(400).json({ message: 'Invalid project data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjects = async (req, res) => {
    try {
        const projects = await Project.find({ company: req.user.company })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name')
            .populate('projectLead', 'name');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('projectLead', 'name')
            .populate('teamMembers.user', 'name');

        if (project && project.company.toString() === req.user.company.toString()) {
            res.json(project);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (project && project.company.toString() === req.user.company.toString()) {
            const oldStatus = project.status;

            project.name = req.body.name || project.name;
            project.location = req.body.location || project.location;
            project.client = req.body.client || project.client;
            project.budget = req.body.budget || project.budget;
            project.start_date = req.body.start_date || project.start_date;
            project.end_date = req.body.end_date || project.end_date;
            project.status = req.body.status || project.status;
            project.progress = req.body.progress !== undefined ? req.body.progress : project.progress;
            project.projectLead = req.body.projectLead || project.projectLead;
            project.description = req.body.description || project.description;
            project.teamMembers = req.body.teamMembers || project.teamMembers;

            // Handle Modules
            if (req.body.modules) {
                // Check if any module was newly enabled
                ['architecture', 'interior', 'construction'].forEach(mod => {
                    if (req.body.modules[mod]?.enabled && !project.modules[mod].enabled) {
                        emitToCompany(req.user.company, 'MODULE_ENABLED', {
                            message: `${mod.charAt(0).toUpperCase() + mod.slice(1)} module enabled for Project: ${project.name}`,
                            projectId: project._id,
                            module: mod
                        });
                    }
                });
                project.modules = req.body.modules;
            }

            // Handle Status History
            if (project.status !== oldStatus) {
                project.statusHistory.push({ status: project.status, date: new Date() });
            }

            const updatedProject = await project.save();

            emitToCompany(req.user.company, 'PROJECT_UPDATED', {
                message: `Project Updated: ${updatedProject.name}`,
                projectId: updatedProject._id,
                status: updatedProject.status
            });

            res.json(updatedProject);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
