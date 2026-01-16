import { Vendor, VendorPerformance, RateHistory } from '../../models/construction/vendor.js';
import { MaterialQuality } from '../../models/construction/material.js';
import Inventory from '../../models/construction/inventory.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Create/Onboard new vendor
// @route   POST /api/vendors
export const createVendor = async (req, res) => {
    try {
        const vendorData = {
            ...req.body,
            company: req.user.company
        };

        const vendor = await Vendor.create(vendorData);

        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all vendors
// @route   GET /api/vendors
export const getVendors = async (req, res) => {
    try {
        const { category, riskLevel, isBlacklisted } = req.query;

        let filter = { company: req.user.company };
        if (category) filter.category = category;
        if (riskLevel) filter.riskLevel = riskLevel;
        if (isBlacklisted !== undefined) filter.isBlacklisted = isBlacklisted === 'true';

        const vendors = await Vendor.find(filter).sort({ performanceScore: -1 });

        res.json(vendors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vendor performance score
// @route   PUT /api/vendors/:id/performance
export const updatePerformanceScore = async (req, res) => {
    try {
        const { month, metrics } = req.body;

        // Create or update performance record
        let performance = await VendorPerformance.findOne({
            vendor: req.params.id,
            month: new Date(month),
            company: req.user.company
        });

        if (!performance) {
            performance = new VendorPerformance({
                vendor: req.params.id,
                month: new Date(month),
                metrics,
                company: req.user.company
            });
        } else {
            performance.metrics = metrics;
        }

        performance.calculateOverallScore();
        await performance.save();

        // Update vendor's overall performance score and rating
        const vendor = await Vendor.findById(req.params.id);
        vendor.performanceScore = performance.overallScore;
        vendor.updateRating();

        // Update risk level based on performance
        if (vendor.performanceScore < 50) {
            vendor.riskLevel = 'RED';
        } else if (vendor.performanceScore < 70) {
            vendor.riskLevel = 'AMBER';
        } else {
            vendor.riskLevel = 'GREEN';
        }

        await vendor.save();

        res.json({ performance, vendor });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Track material rate history
// @route   POST /api/vendors/:id/rate-history
export const trackRateHistory = async (req, res) => {
    try {
        const { materialMaster, rate, effectiveDate, contractedRate, marketRate, notes } = req.body;

        const rateHistory = await RateHistory.create({
            vendor: req.params.id,
            materialMaster,
            rate,
            effectiveDate: effectiveDate || new Date(),
            contractedRate,
            marketRate,
            notes,
            company: req.user.company
        });

        // Alert if price fluctuation > 10%
        if (Math.abs(rateHistory.priceFluctuation) > 10) {
            emitToCompany(req.user.company, 'PRICE_FLUCTUATION_ALERT', {
                vendor: req.params.id,
                material: materialMaster,
                fluctuation: rateHistory.priceFluctuation,
                message: `Price ${rateHistory.priceFluctuation > 0 ? 'increased' : 'decreased'} by ${Math.abs(rateHistory.priceFluctuation).toFixed(2)}%`
            });
        }

        res.status(201).json(rateHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get vendor recommendation for material
// @route   GET /api/vendors/recommend/:materialId
export const getVendorRecommendation = async (req, res) => {
    try {
        const materialId = req.params.materialId;

        // Find vendors who supply this material (from rate history)
        const rateHistories = await RateHistory.find({
            materialMaster: materialId,
            company: req.user.company
        }).populate('vendor').sort({ effectiveDate: -1 });

        // Get unique vendors with their latest rates
        const vendorMap = new Map();
        rateHistories.forEach(rh => {
            if (rh.vendor && !vendorMap.has(rh.vendor._id.toString())) {
                vendorMap.set(rh.vendor._id.toString(), {
                    vendor: rh.vendor,
                    rate: rh.rate,
                    effectiveDate: rh.effectiveDate
                });
            }
        });

        // Score and rank vendors
        const recommendations = Array.from(vendorMap.values())
            .filter(v => !v.vendor.isBlacklisted)
            .map(v => {
                // Score based on: performance (40%), rate (40%), delivery capacity (20%)
                const performanceScore = v.vendor.performanceScore || 0;

                // Rate score: lower is better (normalize to 0-100)
                const allRates = Array.from(vendorMap.values()).map(x => x.rate);
                const minRate = Math.min(...allRates);
                const maxRate = Math.max(...allRates);
                const rateScore = maxRate > minRate ? ((maxRate - v.rate) / (maxRate - minRate)) * 100 : 100;

                // Delivery capacity score
                const capacityScore = Math.min((v.vendor.deliveryCapacity / 1000) * 100, 100);

                const totalScore = (performanceScore * 0.4) + (rateScore * 0.4) + (capacityScore * 0.2);

                return {
                    ...v,
                    totalScore,
                    recommendation: totalScore > 70 ? 'HIGHLY_RECOMMENDED' : totalScore > 50 ? 'RECOMMENDED' : 'CONSIDER'
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore);

        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Blacklist vendor
// @route   PUT /api/vendors/:id/blacklist
export const blacklistVendor = async (req, res) => {
    try {
        const { reason } = req.body;

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        vendor.isBlacklisted = true;
        vendor.blacklistReason = reason;
        vendor.blacklistDate = new Date();
        vendor.riskLevel = 'RED';

        await vendor.save();

        emitToCompany(req.user.company, 'VENDOR_BLACKLISTED', {
            vendorId: vendor._id,
            vendorName: vendor.name,
            reason,
            message: `Vendor ${vendor.name} has been blacklisted`
        });

        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get vendor performance history
// @route   GET /api/vendors/:id/performance-history
export const getPerformanceHistory = async (req, res) => {
    try {
        const history = await VendorPerformance.find({
            vendor: req.params.id,
            company: req.user.company
        }).sort({ month: -1 }).limit(12);

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get rate history for vendor-material combination
// @route   GET /api/vendors/:id/rate-history/:materialId
export const getRateHistory = async (req, res) => {
    try {
        const history = await RateHistory.find({
            vendor: req.params.id,
            materialMaster: req.params.materialId,
            company: req.user.company
        }).sort({ effectiveDate: -1 });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
