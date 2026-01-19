import { Worker } from '../../models/construction/worker.js';

export const createWorker = async (req, res) => {
    try {
        const workerData = req.body;
        // Basic validation or ID generation could go here
        // For now trusting frontend sends correct data structure

        const newWorker = new Worker(workerData);
        await newWorker.save();
        res.status(201).json({ success: true, data: newWorker });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getWorkers = async (req, res) => {
    try {
        const workers = await Worker.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: workers.length, data: workers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });
        if (!worker) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }
        res.status(200).json({ success: true, data: worker });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!worker) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
