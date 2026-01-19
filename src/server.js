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
app.use(cors());

app.use(express.json());

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
app.use('/api/workers', workerRoutes);
app.use('/api/construction/clients', clientRoutes);
app.use('/api/construction/contractors', contractorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
