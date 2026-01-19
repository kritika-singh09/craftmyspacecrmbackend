import Invoice from '../models/invoice.js';

// @desc    Create a new invoice
// @route   POST /api/finance/invoices
export const createInvoice = async (req, res) => {
    try {
        const {
            invoiceNumber, client, project, amount, taxAmount,
            totalAmount, dueDate, businessVertical,
            items, notes, attachments
        } = req.body;

        console.log('Creating Invoice for company:', req.user.company);

        const invoice = await Invoice.create({
            invoiceNumber,
            client: client || 'Walking Client',
            project,
            amount,
            taxAmount,
            totalAmount,
            dueDate,
            businessVertical,
            items,
            notes,
            attachments,
            company: req.user.company
        });

        res.status(201).json(invoice);
    } catch (error) {
        console.error('INVOICE_CREATE_ERROR:', error);
        res.status(500).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Get all invoices for a company
// @route   GET /api/finance/invoices
export const getInvoices = async (req, res) => {
    try {
        const { project, status, businessVertical } = req.query;
        let filter = { company: req.user.company };

        if (project) filter.project = project;
        if (status) filter.status = status;
        if (businessVertical) filter.businessVertical = businessVertical;

        const invoices = await Invoice.find(filter)
            .populate('project', 'name')
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update invoice status
// @route   PUT /api/finance/invoices/:id/status
export const updateInvoiceStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        invoice.status = status;
        await invoice.save();

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
