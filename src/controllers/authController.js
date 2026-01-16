import jwt from 'jsonwebtoken';
import userregistration from '../models/userregistration.js';
import companyregistration from '../models/companyregistration.js';
import login from '../models/login.js';
import Project from '../models/construction/project.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

export const registerCompany = async (req, res) => {
    try {
        const {
            companyName, ownerName, email, password, phone, address, gstNumber
        } = req.body;
        let companyTypes = req.body.companyTypes || req.body.companyType;

        if (Array.isArray(companyTypes)) {
            companyTypes = companyTypes.map(t => t.trim());
        }

        // Check if user already exists
        const userExists = await userregistration.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create Company
        const company = await companyregistration.create({
            name: companyName,
            ownerName,
            email,
            phone,
            gstNumber,
            address,
            companyTypes
        });

        // Create User (Company Admin)
        const user = await userregistration.create({
            name: ownerName,
            email,
            password,
            role: 'COMPANY_ADMIN',
            company: company._id
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: company._id,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const registerSuperAdmin = async (req, res) => {
    try {
        const { name, email, password, secretKey } = req.body;

        // Basic validation
        if (!name || !email || !password || !secretKey) {
            return res.status(400).json({ message: 'All fields (name, email, password, secretKey) are required.' });
        }

        // Validate secret key configuration
        if (!process.env.SUPER_ADMIN_SECRET_KEY) {
            console.error('CRITICAL: SUPER_ADMIN_SECRET_KEY is missing in process.env');
            return res.status(500).json({ message: 'Server configuration error: SUPER_ADMIN_SECRET_KEY not set.' });
        }

        // Validate secret key
        if (secretKey !== process.env.SUPER_ADMIN_SECRET_KEY) {
            return res.status(403).json({ message: 'Invalid secret key. Unauthorized to create Super Admin.' });
        }

        // Check if user already exists
        const userExists = await userregistration.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create Super Admin User (no company association)
        const user = await userregistration.create({
            name,
            email,
            password,
            role: 'SUPER_ADMIN',
            company: null
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: null,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const registerUser = async (req, res) => {
    try {
        const {
            name, email, password, role, companyId, phone,
            accessLevel, skills, certifications, reportingTo,
            notificationSettings
        } = req.body;

        // Check if user already exists
        const userExists = await userregistration.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if company exists
        const company = await companyregistration.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Create User (Default to PENDING & Force Password Reset)
        const user = await userregistration.create({
            name,
            email,
            password,
            role,
            company: companyId,
            phone,
            accessLevel: accessLevel || 'READ',
            skills,
            certifications,
            reportingTo,
            notificationSettings,
            status: 'PENDING',
            forcePasswordReset: true,
            timeline: [{
                action: 'Personnel Created in Vault',
                date: new Date(),
                performedBy: req.user?.name || 'System Auto'
            }]
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userregistration.findOne({ email }).select('+password');

        if (user && (await user.comparePassword(password))) {
            // Log the login
            try {
                await login.create({
                    user: user._id,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } catch (logError) {
                console.error('FAILED_TO_LOG_LOGIN:', logError);
                // We continue even if logging fails
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('LOGIN_ERROR in controllers/authController.js:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await userregistration.find().populate('company', 'name');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const companies = await companyregistration.find(
            { status: 'active' },
            { _id: 1, name: 1 }
        ).sort({ name: 1 });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserTimeline = async (req, res) => {
    try {
        const user = await userregistration.findById(req.params.id, 'timeline name');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.timeline || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserAssignments = async (req, res) => {
    try {
        // Project imported at top level
        const projects = await Project.find({
            $or: [
                { projectLead: req.params.id },
                { 'teamMembers.user': req.params.id }
            ],
            company: req.user.company
        }).populate('projectLead', 'name');

        const assignments = projects.map(p => {
            const teamInfo = p.teamMembers.find(m => m.user?.toString() === req.params.id);
            return {
                projectId: p._id,
                name: p.name,
                code: p.projectCode,
                status: p.status,
                startDate: p.start_date,
                role: p.projectLead?._id?.toString() === req.params.id ? 'Project Lead' : (teamInfo?.role || 'Team Member')
            };
        });

        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
