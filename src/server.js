import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/construction/projectRoutes.js';
import reportRoutes from './routes/construction/reportRoutes.js';
import documentRoutes from './routes/construction/documentRoutes.js';
import materialRoutes from './routes/construction/materialRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import safetyRoutes from './routes/safetyRoutes.js';
import qualityRoutes from './routes/construction/qualityRoutes.js';
import complianceRoutes from './routes/construction/complianceRoutes.js';
import vendorRoutes from './routes/construction/vendorRoutes.js';
import workerRoutes from './routes/construction/workerRoutes.js';
import labourRoutes from './routes/construction/labourRoutes.js';
import clientRoutes from './routes/construction/clientRoutes.js';
import contractorRoutes from './routes/construction/contractorRoutes.js';
import purchaseOrderRoutes from './routes/construction/purchaseOrderRoutes.js';
import { initSocket } from './config/socket.js'; // ⚡ WS: Socket initialization

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io ⚡
initSocket(server);

// Middleware
// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'https://craftmyspacecrmfrontend.vercel.app',
    'https://craftmyspacecrmbackend.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Error handler for JSON syntax errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON format: " + err.message,
            tip: "Ensure all lines except the last one have a comma, and use double quotes."
        });
    }
    next();
});

// Routes
app.use('/api/workers', workerRoutes);
app.use('/api/labour', labourRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api', vendorRoutes);
app.use('/api/construction/clients', clientRoutes);
app.use('/api/construction/contractors', contractorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Debug Catch-all 404 (returns JSON instead of HTML)
app.use((req, res) => {
    console.log(`Resource not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        method: req.method,
        path: req.url,
        tip: 'Check if the route is registered in server.js'
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
