import Labour from '../models/Labour.js';
import cloudinary from '../config/cloudinary.js';

// Get all labour workers
export const getAllLabour = async (req, res) => {
    try {
        const { tenantId } = req.query;

        const query = { isActive: true };
        if (tenantId) {
            query.tenantId = tenantId;
        }

        const labour = await Labour.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: labour
        });
    } catch (error) {
        console.error('Error fetching labour workers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch labour workers'
        });
    }
};

// Add new labour worker
export const addLabour = async (req, res) => {
    try {
        console.log('Adding labour worker...');
        console.log('req.body:', req.body);
        console.log('req.file:', req.file);

        let labourData = {};
        try {
            labourData = typeof req.body.labourData === 'string'
                ? JSON.parse(req.body.labourData)
                : (req.body.labourData || {});
        } catch (e) {
            console.error('Error parsing labourData:', e);
            return res.status(400).json({ success: false, error: 'Invalid labourData format' });
        }
        console.log('Parsed labourData:', labourData);

        // Check if Aadhar already exists
        const existingLabour = await Labour.findOne({ aadharNumber: labourData.aadharNumber });
        if (existingLabour) {
            console.warn('Aadhar number already exists:', labourData.aadharNumber);
            return res.status(400).json({
                success: false,
                error: 'Labour worker with this Aadhar number already exists'
            });
        }

        // Upload photo to Cloudinary if provided
        let photoUrl = null;
        if (req.file) {
            try {
                // Using buffer for serverless compatibility
                const b64 = Buffer.from(req.file.buffer).toString('base64');
                const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const uploadRes = await cloudinary.uploader.upload(dataURI, {
                    folder: 'labour_photos',
                    resource_type: 'auto'
                });
                photoUrl = uploadRes.secure_url;
                console.log('Photo uploaded to Cloudinary:', photoUrl);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                // Continue without photo instead of failing
            }
        }

        const newLabour = new Labour({
            ...labourData,
            photo: photoUrl
        });

        await newLabour.save();
        console.log('New labour worker saved:', newLabour._id);

        res.status(201).json({
            success: true,
            data: newLabour,
            message: 'Labour worker added successfully'
        });
    } catch (error) {
        console.error('Error adding labour worker:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add labour worker'
        });
    }
};

// Update labour worker
export const updateLabour = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Update Request for ID:', id);

        // Handle multipart/form-data parsing
        let updateData = {};
        try {
            updateData = typeof req.body.labourData === 'string'
                ? JSON.parse(req.body.labourData)
                : (req.body.labourData || {});
            console.log('Update Data received:', updateData);
        } catch (e) {
            console.error('Error parsing labourData:', e);
            return res.status(400).json({ success: false, error: 'Invalid labourData format' });
        }

        // Handle photo upload if a new file is provided
        if (req.file) {
            console.log('New photo received for update');
            try {
                const b64 = Buffer.from(req.file.buffer).toString('base64');
                const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const uploadRes = await cloudinary.uploader.upload(dataURI, {
                    folder: 'labour_photos',
                    resource_type: 'auto'
                });
                updateData.photo = uploadRes.secure_url;
                console.log('New photo URL:', updateData.photo);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
            }
        }

        const labour = await Labour.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!labour) {
            console.warn('Labour worker not found for update, ID:', id);
            return res.status(404).json({
                success: false,
                error: 'Labour worker not found'
            });
        }

        console.log('Labour updated successfully in DB:', labour._id);
        res.status(200).json({
            success: true,
            data: labour,
            message: 'Labour worker updated successfully'
        });
    } catch (error) {
        console.error('Error updating labour worker:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update labour worker'
        });
    }
};

// Mark attendance
export const markAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status, lateFee } = req.body;

        const labour = await Labour.findById(id);
        if (!labour) {
            return res.status(404).json({
                success: false,
                error: 'Labour worker not found'
            });
        }

        // Check if attendance already exists for this date
        const dateStr = new Date(date).toISOString().split('T')[0];
        const existingIndex = labour.attendance.findIndex(a =>
            new Date(a.date).toISOString().split('T')[0] === dateStr
        );

        if (status === 'None') {
            // Remove attendance record if it exists
            if (existingIndex !== -1) {
                labour.attendance.splice(existingIndex, 1);
            }
        } else {
            if (existingIndex !== -1) {
                labour.attendance[existingIndex].status = status;
                labour.attendance[existingIndex].lateFee = lateFee || 0;
            } else {
                labour.attendance.push({ date, status, lateFee: lateFee || 0 });
            }
        }

        await labour.save();
        res.status(200).json({
            success: true,
            data: labour,
            message: 'Attendance marked successfully'
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to mark attendance'
        });
    }
};

export const updateBatchAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, error: 'Updates must be an array' });
        }

        const labour = await Labour.findById(id);
        if (!labour) {
            return res.status(404).json({ success: false, error: 'Labour worker not found' });
        }

        updates.forEach(update => {
            const { date, status, lateFee } = update;
            const dateStr = new Date(date).toISOString().split('T')[0];
            const existingIndex = labour.attendance.findIndex(a =>
                new Date(a.date).toISOString().split('T')[0] === dateStr
            );

            if (status === 'None') {
                if (existingIndex !== -1) {
                    labour.attendance.splice(existingIndex, 1);
                }
            } else {
                if (existingIndex !== -1) {
                    labour.attendance[existingIndex].status = status;
                    labour.attendance[existingIndex].lateFee = lateFee || 0;
                } else {
                    labour.attendance.push({ date, status, lateFee: lateFee || 0 });
                }
            }
        });

        await labour.save();
        res.status(200).json({ success: true, data: labour });
    } catch (error) {
        console.error('Error batch updating attendance:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update batch attendance' });
    }
};

// Add advance
export const addAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        const labour = await Labour.findById(id);
        if (!labour) {
            return res.status(404).json({
                success: false,
                error: 'Labour worker not found'
            });
        }

        labour.advances.push({ amount, reason });
        await labour.save();

        res.status(200).json({
            success: true,
            data: labour,
            message: 'Advance recorded successfully'
        });
    } catch (error) {
        console.error('Error adding advance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record advance'
        });
    }
};

// Settle account
// Settle account
export const settleAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { amountPaid, notes } = req.body;

        const labour = await Labour.findById(id);
        if (!labour) {
            return res.status(404).json({
                success: false,
                error: 'Labour worker not found'
            });
        }

        // Calculate unpaid earnings
        let totalEarnings = 0;
        labour.attendance.forEach(att => {
            if (!att.paid) {
                let dailyWage = labour.dailyWage || 0;
                if (att.status === 'P' || att.status === 'Late') {
                    totalEarnings += dailyWage;
                } else if (att.status === 'HD') {
                    totalEarnings += dailyWage / 2;
                }

                if (att.lateFee) {
                    totalEarnings -= att.lateFee;
                }
            }
        });

        const unsettledAdvances = labour.advances.filter(a => !a.settled).reduce((sum, a) => sum + a.amount, 0);
        const netPayable = totalEarnings - unsettledAdvances;
        const finalPaid = amountPaid !== undefined ? Number(amountPaid) : netPayable;

        // Mark items as paid/settled
        labour.attendance.forEach(a => { if (!a.paid) a.paid = true; });
        labour.advances.forEach(a => { if (!a.settled) a.settled = true; });

        labour.settlements.push({
            date: new Date(),
            totalEarnings: totalEarnings,
            advancesDeducted: unsettledAdvances,
            netPaid: finalPaid,
            notes: notes || 'Settlement'
        });

        // Reset pending dues assuming full settlement, as logic implies clearing the slate
        labour.pendingDues = 0;

        await labour.save();
        res.status(200).json({
            success: true,
            data: labour,
            message: 'Account settled successfully'
        });
    } catch (error) {
        console.error('Error settling account:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to settle account'
        });
    }
};

// Delete labour worker (soft delete)
export const deleteLabour = async (req, res) => {
    try {
        const { id } = req.params;
        const labour = await Labour.findByIdAndUpdate(id, { isActive: false }, { new: true });

        if (!labour) {
            return res.status(404).json({
                success: false,
                error: 'Labour worker not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Labour worker deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting labour worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete labour worker'
        });
    }
};
