const express = require('express');
const router = express.Router();
const FinanceProject = require('../models/FinanceProject');
const FinanceEntry = require('../models/FinanceEntry');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('teacher'));

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
    const developerPaid = Number(linkedTotals.teamExpense ?? savedDeveloperPaid);
    const clientTotal = Number(plain.clientTotal || 0);
    const clientReceived = Number(linkedTotals.income ?? plain.clientReceived ?? 0);
    const clientDue = Math.max(0, clientTotal - clientReceived);
    const developerDue = Math.max(0, developerTotal - developerPaid);

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
            clientDue,
            developerDue,
            currentCash: developerDue
        }
    };
};

router.get('/projects', async (req, res) => {
    try {
        const projects = await FinanceProject.find({ assignedTeachers: req.user._id })
            .populate('createdBy', 'name')
            .populate('assignedTeachers', 'name email')
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
            if (!totals[projectId]) totals[projectId] = { income: 0, expense: 0, teamExpense: 0, companyExpense: 0, teamMembers: {}, companies: {} };
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

router.put('/projects/:id', async (req, res) => {
    try {
        const project = await FinanceProject.findOne({ _id: req.params.id, assignedTeachers: req.user._id });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found or not assigned to you' });
        const { name, clientName, clientPhone, clientTotal, clientReceived, developers, companies, status, startDate, completionDate, description } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (clientName !== undefined) updates.clientName = clientName;
        if (clientPhone !== undefined) updates.clientPhone = clientPhone;
        if (clientTotal !== undefined) updates.clientTotal = Number(clientTotal || 0);
        if (clientReceived !== undefined) updates.clientReceived = Number(clientReceived || 0);
        if (developers !== undefined) updates.developers = developers;
        if (companies !== undefined) updates.companies = companies;
        if (status !== undefined) updates.status = status;
        if (startDate !== undefined) updates.startDate = startDate;
        if (completionDate !== undefined) updates.completionDate = completionDate;
        if (description !== undefined) updates.description = description;
        const updated = await FinanceProject.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate('createdBy', 'name')
            .populate('assignedTeachers', 'name email');
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
