import { Worker } from '../../models/construction/worker.js';
import mongoose from 'mongoose';

// Helper to find the first available ID
const getAvailableId = async (prefix) => {
    // Find all workers with IDs starting with this prefix
    const regex = new RegExp(`^${prefix}\\d+$`, 'i'); // Case insensitive search for PREFIX + digits
    const workers = await Worker.find({ workerId: regex }).select('workerId');

    const existingIds = workers.map(w => {
        const match = w.workerId.match(/(\d+)$/);
        return match ? parseInt(match[0], 10) : 0;
    }).sort((a, b) => a - b);

    let nextId = 1;
    for (const id of existingIds) {
        if (id === nextId) {
            nextId++;
        } else if (id > nextId) {
            // Found a gap
            break;
        }
    }

    // Format with leading zeros (e.g., 001)
    return `${prefix}${String(nextId).padStart(3, '0')}`;
};

export const getNextId = async (req, res) => {
    try {
        const { type } = req.query; // 'Site' or 'Office'
        const prefix = type === 'Site' ? 'W-' : 'EMP-';
        const nextId = await getAvailableId(prefix);
        res.status(200).json({ success: true, nextId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createWorker = async (req, res) => {
    try {
        const workerData = req.body;

        // Auto-generate ID if not provided, empty, or just whitespace
        if (!workerData.workerId || workerData.workerId.trim() === '') {
            const type = workerData.type || 'Site'; // Default to Site if missing
            const prefix = type === 'Site' ? 'W-' : 'EMP-';
            workerData.workerId = await getAvailableId(prefix);
        }

        // Validate that we actually have an ID now
        if (!workerData.workerId) {
            throw new Error('Failed to generate Worker ID');
        }

        const newWorker = new Worker(workerData);
        await newWorker.save();
        res.status(201).json({ success: true, data: newWorker });
    } catch (error) {
        console.error('Create Worker Error:', error);
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
        // Hard delete to free up the ID
        const worker = await Worker.findByIdAndDelete(id);

        if (!worker) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }
        res.status(200).json({ success: true, data: {}, message: 'Worker deleted permanently and ID freed.' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
export const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status, lateFee } = req.body;

        const worker = await Worker.findById(id);
        if (!worker) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        // Check if attendance for this date already exists
        const attDate = new Date(date);
        attDate.setHours(0, 0, 0, 0);

        const existingIndex = worker.attendance.findIndex(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === attDate.getTime();
        });

        if (existingIndex !== -1) {
            worker.attendance[existingIndex].status = status;
            worker.attendance[existingIndex].lateFee = lateFee || 0;
            // Ensure paid is false when updating (unless explicitly handled, but for simplest logic, any update resets paid status or kept separate. 
            // Better: if paid is true, maybe allow update but warn? For now, we assume updates might reset paid
            // But actually we want: paid: false for new entries. Existing entries keep their paid status unless we mistakenly broke it.
            // Let's just set paid: false for new pushes only.
        } else {
            worker.attendance.push({ date: attDate, status, lateFee: lateFee || 0, paid: false }); // explicit paid: false
        }

        await worker.save();
        res.status(200).json({ success: true, data: worker });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const updateBatchAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body; // Array of { date, status, lateFee }

        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, error: 'Updates must be an array' });
        }

        const worker = await Worker.findById(id);
        if (!worker) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        updates.forEach(update => {
            const { date, status, lateFee } = update;
            const attDate = new Date(date);
            attDate.setHours(0, 0, 0, 0);

            const existingIndex = worker.attendance.findIndex(a => {
                const d = new Date(a.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === attDate.getTime();
            });

            if (existingIndex !== -1) {
                worker.attendance[existingIndex].status = status;
                worker.attendance[existingIndex].lateFee = lateFee || 0;
            } else {
                worker.attendance.push({ date: attDate, status, lateFee: lateFee || 0, paid: false });
            }
        });

        await worker.save();
        res.status(200).json({ success: true, data: worker });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const addAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason, date } = req.body;

        const worker = await Worker.findById(id);
        if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });

        worker.advances.push({
            amount,
            reason,
            date: date || new Date(),
            settled: false
        });

        await worker.save();
        res.status(200).json({ success: true, data: worker });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const settleWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const { amountPaid } = req.body; // User specifies how much they are PAYING now

        const worker = await Worker.findById(id);
        if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });

        let totalEarnings = 0;
        let totalDeductions = 0;
        let settledDaysCount = 0;
        let settledAdvancesCount = 0;
        const dailyWage = worker.dailyWage || 0;
        const previousDues = worker.pendingDues || 0;

        // Mark unpaid attendance as paid
        worker.attendance.forEach(att => {
            if (!att.paid) {
                if (att.status === 'P') totalEarnings += dailyWage;
                if (att.status === 'HD') totalEarnings += (dailyWage * 0.5);
                if (att.status === 'Late') totalEarnings += (dailyWage - (att.lateFee || 0));

                att.paid = true;
                settledDaysCount++;
            }
        });

        // Mark unsettled advances as settled
        worker.advances.forEach(adv => {
            if (!adv.settled) {
                totalDeductions += adv.amount;
                adv.settled = true;
                settledAdvancesCount++;
            }
        });

        // Calculate Net Payable including previous dues
        const netPayable = (totalEarnings + previousDues) - totalDeductions;

        // Determine what is being paid vs carried forward
        // If amountPaid is undefined, assume full settlement (legacy behavior support)
        // If amountPaid is provided, use it.
        const actualPaid = amountPaid !== undefined ? Number(amountPaid) : netPayable;
        const carryForward = netPayable - actualPaid;

        // Update pending dues for next time
        worker.pendingDues = carryForward;

        if (netPayable > 0 || totalEarnings > 0 || totalDeductions > 0 || Math.abs(carryForward) > 0) {
            let note = `Settled ${settledDaysCount} days. Deducted ${settledAdvancesCount} advances.`;
            if (previousDues > 0) note += ` (Inc. prev dues: ₹${previousDues})`;
            if (carryForward !== 0) note += ` Carried forward: ₹${carryForward}`;

            worker.settlements.push({
                date: new Date(),
                totalEarnings, // Earnings from THIS period's work
                totalDeductions,
                netAmount: actualPaid, // What was actually paid
                notes: note
            });
        }

        await worker.save();

        res.status(200).json({
            success: true,
            data: worker,
            summary: {
                totalEarnings,
                totalDeductions,
                previousDues,
                netPayable,
                paid: actualPaid,
                carriedForward: carryForward
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
