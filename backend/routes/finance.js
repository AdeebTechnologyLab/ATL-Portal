const express = require('express');
const router = express.Router();
const FinanceEntry = require('../models/FinanceEntry');
const FinanceProject = require('../models/FinanceProject');
const Fee = require('../models/Fee');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

const projectData = (project, linkedTotals = {}) => {
    const plain = project.toObject ? project.toObject() : project;
    const developers = (plain.developers || []).map(developer => ({
        ...(developer.toObject ? developer.toObject() : developer),
        paidAmount: Number(linkedTotals.teamMembers?.[String(developer._id)] ?? developer.paidAmount ?? 0)
    }));
    const companies = (plain.companies || []).map(company => ({
        ...(company.toObject ? company.toObject() : company),
        paidAmount: Number(linkedTotals.companies?.[String(company._id)] ?? company.paidAmount ?? 0)
    }));
    const developerTotal = developers.reduce((sum, developer) => sum + Number(developer.totalPayable || 0), 0);
    const savedDeveloperPaid = developers.reduce((sum, developer) => sum + Number(developer.paidAmount || 0), 0);
    const companyTotal = companies.reduce((sum, company) => sum + Number(company.totalPayable || 0), 0);
    const savedCompanyPaid = companies.reduce((sum, company) => sum + Number(company.paidAmount || 0), 0);
    const developerPaid = Number(linkedTotals.teamExpense ?? savedDeveloperPaid);
    const companyPaid = Number(linkedTotals.companyExpense ?? savedCompanyPaid);
    const clientTotal = Number(plain.clientTotal || 0);
    const clientReceived = Number(linkedTotals.income ?? plain.clientReceived ?? 0);
    const clientDue = Math.max(0, clientTotal - clientReceived);
    const developerDue = Math.max(0, developerTotal - developerPaid);
    const companyDue = Math.max(0, companyTotal - companyPaid);

    return {
        ...plain,
        developers,
        companies,
        clientReceived,
        status: developerTotal > 0 && developerDue === 0 ? 'completed' : 'processing',
        metrics: {
            developerTotal,
            developerPaid,
            companyTotal,
            companyPaid,
            clientDue,
            developerDue,
            companyDue,
            expectedProfit: companyTotal || clientTotal - developerTotal,
            currentCash: developerDue,
            financialStatus: clientDue === 0 && developerDue === 0 && companyDue === 0 ? 'cleared' : 'outstanding'
        }
    };
};

const normalizeProjectPayload = body => ({
    name: body.name,
    clientName: body.clientName,
    clientPhone: body.clientPhone || '',
    clientTotal: Number(body.clientTotal || 0),
    clientReceived: Number(body.clientReceived || 0),
    developers: (body.developers || []).map(developer => ({
        name: developer.name,
        designation: developer.designation || '',
        percentage: Number(developer.percentage || 0),
        totalPayable: Number(developer.totalPayable || 0),
        paidAmount: Number(developer.paidAmount || 0)
    })),
    companies: (body.companies || []).map(company => ({
        name: company.name,
        designation: company.designation || '',
        percentage: Number(company.percentage || 0),
        totalPayable: Number(company.totalPayable || 0),
        paidAmount: Number(company.paidAmount || 0)
    })),
    status: body.status || 'processing',
    startDate: body.startDate || new Date(),
    completionDate: body.status === 'completed' ? (body.completionDate || new Date()) : null,
    description: body.description || ''
});

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate) dateFilter.$lte = new Date(`${endDate}T23:59:59.999Z`);
        const entryQuery = Object.keys(dateFilter).length ? { transactionDate: dateFilter } : {};
        const entries = await FinanceEntry.find(entryQuery)
            .populate('createdBy', 'name')
            .populate('project', 'name clientName developers companies')
            .sort({ transactionDate: -1, createdAt: -1 });
        const fees = await Fee.find().select('installments');
        const projectQuery = Object.keys(dateFilter).length ? { startDate: dateFilter } : {};
        const projects = await FinanceProject.find(projectQuery);
        const feeIncome = fees.reduce((sum, fee) => sum + (fee.installments || [])
            .filter(item => {
                if (item.status !== 'verified') return false;
                if (!Object.keys(dateFilter).length) return true;
                const incomeDate = new Date(item.verifiedAt || item.paidAt || item.dueDate);
                return (!dateFilter.$gte || incomeDate >= dateFilter.$gte) && (!dateFilter.$lte || incomeDate <= dateFilter.$lte);
            })
            .reduce((total, item) => total + Number(item.amount || 0), 0), 0);
        const manualIncome = entries.filter(e => e.type === 'income' && !e.project).reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = entries.filter(e => e.type === 'expense' && !e.project).reduce((sum, e) => sum + e.amount, 0);
        const projectIncome = entries.filter(e => e.type === 'income' && e.project).reduce((sum, e) => sum + e.amount, 0);
        const projectExpenses = entries.filter(e => e.type === 'expense' && e.project).reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = entries.filter(e => e.type === 'expense').reduce((acc, entry) => {
            acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
            return acc;
        }, {});

        res.json({
            success: true,
            data: entries,
            summary: {
                feeIncome,
                manualIncome,
                projectIncome,
                projectExpenses,
                totalIncome: feeIncome + manualIncome + projectIncome,
                totalExpenses: totalExpenses + projectExpenses,
                balance: feeIncome + manualIncome + projectIncome - totalExpenses - projectExpenses,
                categoryTotals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/projects', async (req, res) => {
    try {
        const projects = await FinanceProject.find()
            .populate('createdBy', 'name')
            .sort({ startDate: -1, createdAt: -1 });
        const projectIds = projects.map(project => project._id);
        const linkedEntries = await FinanceEntry.aggregate([
            { $match: { project: { $in: projectIds } } },
            { $group: {
                _id: { project: '$project', type: '$type', teamMemberId: '$teamMemberId', companyId: '$companyId' },
                total: { $sum: '$amount' }
            } }
        ]);
        const totalsByProject = linkedEntries.reduce((totals, entry) => {
            const projectId = String(entry._id.project);
            totals[projectId] ||= { income: 0, expense: 0, teamExpense: 0, companyExpense: 0, teamMembers: {}, companies: {} };
            totals[projectId][entry._id.type] += entry.total;
            if (entry._id.type === 'expense' && entry._id.teamMemberId) {
                const memberId = String(entry._id.teamMemberId);
                totals[projectId].teamMembers[memberId] = (totals[projectId].teamMembers[memberId] || 0) + entry.total;
                totals[projectId].teamExpense += entry.total;
            }
            if (entry._id.type === 'expense' && entry._id.companyId) {
                const companyId = String(entry._id.companyId);
                totals[projectId].companies[companyId] = (totals[projectId].companies[companyId] || 0) + entry.total;
                totals[projectId].companyExpense += entry.total;
            }
            return totals;
        }, {});
        res.json({
            success: true,
            data: projects.map(project => projectData(project, totalsByProject[String(project._id)] || { income: 0, expense: 0, teamExpense: 0, companyExpense: 0, teamMembers: {}, companies: {} }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        const project = await FinanceProject.create({
            ...normalizeProjectPayload(req.body),
            createdBy: req.user.id
        });
        res.status(201).json({ success: true, data: projectData(project) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const project = await FinanceProject.findByIdAndUpdate(
            req.params.id,
            normalizeProjectPayload(req.body),
            { new: true, runValidators: true }
        );
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, data: projectData(project) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        const project = await FinanceProject.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const entry = await FinanceEntry.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const entry = await FinanceEntry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true, data: entry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const entry = await FinanceEntry.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
