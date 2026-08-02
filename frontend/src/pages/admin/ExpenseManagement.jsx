import { useEffect, useMemo, useState } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, Landmark, Plus, Pencil, Trash2, X,
    BriefcaseBusiness, Users, CircleDollarSign, Clock3, CheckCircle2, AlertTriangle,
    ChevronDown, ChevronUp, UserRoundPlus, Search, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { financeAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';

const categories = ['Rent', 'Salaries', 'Bills', 'Marketing', 'Equipment', 'Internet', 'Maintenance', 'Transport', 'Food', 'Pocket Money', 'Guest', 'Sim Balance', 'Shopping', 'Project', 'Loan', 'Other'];
const categoryIcons = { 'Office Rent': '🏢', Salaries: '👥', Utilities: '💡', Marketing: '📣', Equipment: '💻', Internet: '🌐', Maintenance: '🛠️', Transport: '🚗', Food: '🍽️', Refreshment: '☕', 'Pocket Money': '👛', Guest: '🤝', Clean: '🧹', 'Sim Balance': '📶', Shopping: '🛍️', 'Course Income': '🎓', 'IOT Project': '📡', 'Website Project': '🌐', 'App Project': '📱', Other: '📦' };
const newCategoryIcons = {
    Rent: '🏢',
    Salaries: '💵',
    Bills: '🧾',
    Project: '📁',
    Loan: '💰',
    Video: '🎬',
    Audio: '🎧',
    Graphics: '🎨',
    AI: '🤖'
};
const getCategoryIcon = category => newCategoryIcons[category] || categoryIcons[category] || '🏷️';
const money = value => `Rs ${Number(value || 0).toLocaleString()}`;
const parseAmount = value => Number(String(value || '').replace(/,/g, ''));
const parsePercentage = value => Number(String(value || '').replace('%', ''));
const formatAmountInput = value => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits).toLocaleString() : '';
};
const fieldClass = 'w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none focus:border-primary';
const monthRange = month => {
    const [year, monthNumber] = month.split('-').map(Number);
    return { startDate: `${month}-01`, endDate: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}` };
};
const multiMonthRange = (month, count) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const end = new Date(year, monthNumber, 0);
    const start = new Date(year, monthNumber - count, 1);
    const toDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { startDate: toDate(start), endDate: toDate(end) };
};
const freshToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const freshCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const emptyDeveloper = () => ({ name: '', designation: '', percentage: '', totalPayable: '', paidAmount: '' });
const emptyCompany = () => ({ name: '', designation: '', percentage: '', totalPayable: '', paidAmount: '' });

const Metric = ({ label, value, tone = 'text-gray-900 dark:text-white' }) => (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`mt-1 text-sm font-black ${tone}`}>{money(value)}</p>
    </div>
);

const ExpenseManagement = () => {
    const [entries, setEntries] = useState([]);
    const [projects, setProjects] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [historyProjectFilter, setHistoryProjectFilter] = useState('all');
    const [expandedProjects, setExpandedProjects] = useState([]);
    const [periodMode, setPeriodMode] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(freshCurrentMonth);
    const [startDate, setStartDate] = useState(() => `${freshCurrentMonth()}-01`);
    const [endDate, setEndDate] = useState(freshToday);
    const [form, setForm] = useState(() => ({ type: 'expense', title: '', amount: '', category: 'Project', customCategory: '', project: '', paymentTarget: '', description: '', transactionDate: freshToday() }));
    const [projectForm, setProjectForm] = useState(() => ({ name: '', clientName: '', clientPhone: '', clientTotal: '', clientReceived: '', developers: [emptyDeveloper()], companies: [emptyCompany()], status: 'processing', startDate: freshToday(), completionDate: '', description: '' }));

    const loadData = async () => {
        try {
            let params = {};
            if (periodMode === 'month') params = monthRange(selectedMonth);
            if (periodMode === 'custom') params = { startDate, endDate };
            const [financeRes, projectsRes] = await Promise.all([financeAPI.getAll(params), financeAPI.getProjects()]);
            setEntries(financeRes.data.data || []);
            setSummary(financeRes.data.summary || {});
            setProjects(projectsRes.data.data || []);
        } catch (error) {
            alert(error.response?.data?.message || 'Finance data load nahi ho saka.');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [periodMode, selectedMonth, startDate, endDate]);

    const availableCategories = useMemo(() => {
        const counts = {};
        entries.forEach(entry => { counts[entry.category] = (counts[entry.category] || 0) + 1; });
        return [...new Set([...categories, ...entries.map(entry => entry.category)])].sort().map(cat => ({ name: cat, count: counts[cat] || 0 }));
    }, [entries]);
    const filteredEntries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return entries.filter(entry => {
            const projectName = entry.project?.name || '';
            const searchableText = `${entry.title || ''} ${entry.description || ''} ${entry.category || ''} ${projectName}`.toLowerCase();
            return (filter === 'all' || entry.type === filter) &&
                (categoryFilter === 'all' || entry.category === categoryFilter) &&
                (historyProjectFilter === 'all' || (historyProjectFilter === 'general' ? !entry.project : entry.project?._id === historyProjectFilter)) &&
                (!query || searchableText.includes(query));
        });
    }, [entries, filter, categoryFilter, historyProjectFilter, searchQuery]);
    const filteredTotal = useMemo(() => filteredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), [filteredEntries]);
    const filteredIncome = useMemo(() => filteredEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0), [filteredEntries]);
    const filteredExpense = useMemo(() => filteredEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0), [filteredEntries]);
    const activeProjects = useMemo(() => projects.filter(project => project.status !== 'completed'), [projects]);
    const completedProjects = useMemo(() => {
        if (periodMode === 'all') return projects.filter(project => project.status === 'completed');
        const range = periodMode === 'month' ? monthRange(selectedMonth) : { startDate, endDate };
        const start = new Date(`${range.startDate}T00:00:00`);
        const end = new Date(`${range.endDate}T23:59:59`);
        return projects.filter(project => {
            if (project.status !== 'completed') return false;
            const d = new Date(project.completionDate || project.startDate);
            return d >= start && d <= end;
        });
    }, [projects, periodMode, selectedMonth, startDate, endDate]);
    const filteredProjects = activeProjects;
    const visibleCompanyProfit = useMemo(() => {
        if (periodMode === 'all') return projects.reduce((total, project) => total + Number(project.metrics?.companyTotal || 0), 0);
        const range = periodMode === 'month' ? monthRange(selectedMonth) : { startDate, endDate };
        const start = new Date(`${range.startDate}T00:00:00`);
        const end = new Date(`${range.endDate}T23:59:59`);
        return projects.filter(project => {
            if (project.status === 'completed') {
                const d = new Date(project.completionDate || project.startDate);
                return d >= start && d <= end;
            }
            return true;
        }).reduce((total, project) => total + Number(project.metrics?.companyTotal || 0), 0);
    }, [projects, periodMode, selectedMonth, startDate, endDate]);
    const visibleProjectCash = useMemo(() => {
        if (periodMode === 'all') return projects.reduce((total, project) => total + Number(project.clientReceived || 0), 0);
        const range = periodMode === 'month' ? monthRange(selectedMonth) : { startDate, endDate };
        const start = new Date(`${range.startDate}T00:00:00`);
        const end = new Date(`${range.endDate}T23:59:59`);
        return projects.filter(project => {
            if (project.status === 'completed') {
                const d = new Date(project.completionDate || project.startDate);
                return d >= start && d <= end;
            }
            return true;
        }).reduce((total, project) => total + Number(project.clientReceived || 0), 0);
    }, [projects, periodMode, selectedMonth, startDate, endDate]);
    const selectedPaymentProject = useMemo(() => projects.find(project => project._id === form.project), [projects, form.project]);
    const projectRemainingValue = useMemo(() => {
        const teamTotal = projectForm.developers.reduce((total, member) => total + parseAmount(member.totalPayable), 0);
        const companyTotal = projectForm.companies.reduce((total, company) => total + parseAmount(company.totalPayable), 0);
        return parseAmount(projectForm.clientTotal) - teamTotal - companyTotal;
    }, [projectForm.clientTotal, projectForm.developers, projectForm.companies]);

    const openNew = () => { setEditingId(null); setForm({ type: 'expense', title: '', amount: '', category: 'Project', customCategory: '', project: '', paymentTarget: '', description: '', transactionDate: freshToday() }); setShowForm(true); };
    const openEdit = entry => {
        const standard = categories.includes(entry.category);
        setEditingId(entry._id);
        const paymentTarget = entry.paymentFor === 'client' ? 'client' : entry.paymentFor === 'team_member' && entry.teamMemberId ? `team:${entry.teamMemberId}` : entry.paymentFor === 'company' && entry.companyId ? `company:${entry.companyId}` : '';
        setForm({ type: entry.type, title: entry.title, amount: formatAmountInput(entry.amount), category: standard ? entry.category : 'Other', customCategory: standard ? '' : entry.category, project: entry.project?._id || entry.project || '', paymentTarget, description: entry.description || '', transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10) });
        setShowForm(true);
    };
    const saveEntry = async event => {
        event.preventDefault(); setSaving(true);
        try {
            const payload = { ...form, category: form.category === 'Other' ? form.customCategory.trim() : form.category, amount: parseAmount(form.amount) };
            delete payload.customCategory;
            payload.project = payload.project || null;
            if (payload.project && !payload.paymentTarget) return alert('Client ya team member select karein.');
            if (payload.paymentTarget === 'client') {
                payload.type = 'income';
                payload.paymentFor = 'client';
                payload.teamMemberId = null;
                payload.companyId = null;
            } else if (payload.paymentTarget.startsWith('team:')) {
                payload.type = 'expense';
                payload.paymentFor = 'team_member';
                payload.teamMemberId = payload.paymentTarget.slice(5);
                payload.companyId = null;
            } else if (payload.paymentTarget.startsWith('company:')) {
                payload.type = 'expense';
                payload.paymentFor = 'company';
                payload.companyId = payload.paymentTarget.slice(8);
                payload.teamMemberId = null;
            } else {
                payload.paymentFor = 'general';
                payload.teamMemberId = null;
                payload.companyId = null;
            }
            delete payload.paymentTarget;
            if (!payload.category) return alert('Custom category name enter karein.');
            editingId ? await financeAPI.update(editingId, payload) : await financeAPI.create(payload);
            setShowForm(false); await loadData();
        } catch (error) { alert(error.response?.data?.message || 'Record save nahi ho saka.'); }
        finally { setSaving(false); }
    };
    const removeEntry = async id => {
        if (!window.confirm('Is finance record ko delete karna hai?')) return;
        await financeAPI.delete(id); await loadData();
    };

    const openNewProject = () => { setEditingProjectId(null); setProjectForm({ name: '', clientName: '', clientPhone: '', clientTotal: '', clientReceived: '', developers: [emptyDeveloper()], companies: [emptyCompany()], status: 'processing', startDate: freshToday(), completionDate: '', description: '' }); setShowProjectForm(true); };
    const openEditProject = project => {
        setEditingProjectId(project._id);
        setProjectForm({
            name: project.name, clientName: project.clientName,
            clientPhone: project.clientPhone || '',
            clientTotal: formatAmountInput(project.clientTotal), clientReceived: formatAmountInput(project.clientReceived),
            developers: (project.developers || []).length ? project.developers.map(developer => ({ name: developer.name, designation: developer.designation || '', percentage: `${developer.percentage || (project.clientTotal ? Number((developer.totalPayable / project.clientTotal * 100).toFixed(2)) : 0)}%`, totalPayable: formatAmountInput(developer.totalPayable), paidAmount: formatAmountInput(developer.paidAmount) })) : [emptyDeveloper()],
            companies: (project.companies || []).length ? project.companies.map(company => ({ name: company.name, designation: company.designation || '', percentage: `${company.percentage || (project.clientTotal ? Number((company.totalPayable / project.clientTotal * 100).toFixed(2)) : 0)}%`, totalPayable: formatAmountInput(company.totalPayable), paidAmount: formatAmountInput(company.paidAmount) })) : [emptyCompany()],
            status: project.status, startDate: new Date(project.startDate).toISOString().slice(0, 10),
            completionDate: project.completionDate ? new Date(project.completionDate).toISOString().slice(0, 10) : '', description: project.description || ''
        });
        setShowProjectForm(true);
    };
    const updateDeveloper = (index, key, value) => setProjectForm(previous => ({ ...previous, developers: previous.developers.map((developer, developerIndex) => developerIndex === index ? { ...developer, [key]: value } : developer) }));
    const updateCompany = (index, key, value) => setProjectForm(previous => ({ ...previous, companies: previous.companies.map((company, companyIndex) => companyIndex === index ? { ...company, [key]: value } : company) }));
    const updateDeveloperShare = (index, key, value) => setProjectForm(previous => {
        const clientTotal = parseAmount(previous.clientTotal);
        const developers = previous.developers.map((developer, developerIndex) => {
            if (developerIndex !== index) return developer;
            if (key === 'percentage') {
                const percentage = value.replace(/[^\d.]/g, '');
                const totalPayable = clientTotal && percentage !== '' ? formatAmountInput(Math.round(clientTotal * Number(percentage) / 100)) : '';
                return { ...developer, percentage: percentage === '' ? '' : `${percentage}%`, totalPayable };
            }
            const totalPayable = formatAmountInput(value);
            const amount = parseAmount(totalPayable);
            const percentage = clientTotal ? `${Number((amount / clientTotal * 100).toFixed(2))}%` : '';
            return { ...developer, totalPayable, percentage };
        });
        return { ...previous, developers };
    });
    const updateCompanyShare = (index, key, value) => setProjectForm(previous => {
        const clientTotal = parseAmount(previous.clientTotal);
        const companies = previous.companies.map((company, companyIndex) => {
            if (companyIndex !== index) return company;
            if (key === 'percentage') {
                const percentage = value.replace(/[^\d.]/g, '');
                const totalPayable = clientTotal && percentage !== '' ? formatAmountInput(Math.round(clientTotal * Number(percentage) / 100)) : '';
                return { ...company, percentage: percentage === '' ? '' : `${percentage}%`, totalPayable };
            }
            const totalPayable = formatAmountInput(value);
            const amount = parseAmount(totalPayable);
            const percentage = clientTotal ? `${Number((amount / clientTotal * 100).toFixed(2))}%` : '';
            return { ...company, totalPayable, percentage };
        });
        return { ...previous, companies };
    });
    const updateProjectTotal = value => setProjectForm(previous => {
        const clientTotal = formatAmountInput(value);
        const amount = parseAmount(clientTotal);
        const developers = previous.developers.map(developer => developer.percentage === '' ? developer : {
            ...developer,
            totalPayable: amount ? formatAmountInput(Math.round(amount * parsePercentage(developer.percentage) / 100)) : ''
        });
        const companies = previous.companies.map(company => company.percentage === '' ? company : {
            ...company,
            totalPayable: amount ? formatAmountInput(Math.round(amount * parsePercentage(company.percentage) / 100)) : ''
        });
        return { ...previous, clientTotal, developers, companies };
    });
    const saveProject = async event => {
        event.preventDefault(); setSaving(true);
        try {
            const payload = {
                ...projectForm,
                clientTotal: parseAmount(projectForm.clientTotal), clientReceived: parseAmount(projectForm.clientReceived),
                developers: projectForm.developers.filter(developer => developer.name.trim()).map(developer => ({ name: developer.name.trim(), designation: developer.designation.trim(), percentage: parsePercentage(developer.percentage), totalPayable: parseAmount(developer.totalPayable), paidAmount: parseAmount(developer.paidAmount) })),
                companies: projectForm.companies.filter(company => company.name.trim()).map(company => ({ name: company.name.trim(), designation: company.designation.trim(), percentage: parsePercentage(company.percentage), totalPayable: parseAmount(company.totalPayable), paidAmount: parseAmount(company.paidAmount) }))
            };
            editingProjectId ? await financeAPI.updateProject(editingProjectId, payload) : await financeAPI.createProject(payload);
            setShowProjectForm(false); await loadData();
        } catch (error) { alert(error.response?.data?.message || 'Project save nahi ho saka.'); }
        finally { setSaving(false); }
    };
    const removeProject = async id => {
        if (!window.confirm('Is project ko permanently delete karna hai?')) return;
        await financeAPI.deleteProject(id); await loadData();
    };

    const downloadFinanceReport = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const reportPeriod = periodMode === 'all'
                ? 'All Time'
                : periodMode === 'month'
                    ? `Month ending ${new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : `${startDate} to ${endDate}`;
            const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB') : '-';
            const pdfMoney = value => `Rs ${Number(value || 0).toLocaleString()}`;
            const tableTheme = {
                headStyles: { fillColor: [255, 138, 0], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
                margin: { left: 12, right: 12 }
            };

            const drawHeader = () => {
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageWidth, 29, 'F');
                doc.setFillColor(255, 138, 0);
                doc.rect(0, 0, 5, 29, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('ADEEB LMS - FINANCE REPORT', 12, 12);
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(203, 213, 225);
                doc.text(`Reporting Period: ${reportPeriod}`, 12, 19);
                doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 12, 24);
            };
            const addSectionTitle = (title, y) => {
                if (y > 184) {
                    doc.addPage();
                    drawHeader();
                    y = 38;
                }
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(title, 12, y);
                doc.setDrawColor(255, 138, 0);
                doc.setLineWidth(0.7);
                doc.line(12, y + 2, 40, y + 2);
                return y + 6;
            };

            drawHeader();

            autoTable(doc, {
                startY: 35,
                head: [['Total Income', 'Total Expenses', 'Available Balance', 'Verified Fee Income', 'Project Total Cash', 'Project Cash Profit']],
                body: [[pdfMoney(summary.totalIncome), pdfMoney(summary.totalExpenses), pdfMoney(summary.balance), pdfMoney(summary.feeIncome), pdfMoney(visibleProjectCash), pdfMoney(visibleCompanyProfit)]],
                ...tableTheme,
                bodyStyles: { fontSize: 11, fontStyle: 'bold', textColor: [15, 23, 42], cellPadding: 4 }
            });

            let nextY = addSectionTitle('TRANSACTION DETAILS', doc.lastAutoTable.finalY + 10);
            autoTable(doc, {
                startY: nextY,
                head: [['#', 'Date', 'Type', 'Title', 'Category', 'Project', 'Description', 'Amount']],
                body: filteredEntries.length
                    ? filteredEntries.map((entry, index) => [
                        index + 1,
                        formatDate(entry.transactionDate),
                        String(entry.type || '-').toUpperCase(),
                        entry.title || '-',
                        entry.category || '-',
                        entry.project?.name || 'General',
                        entry.description || '-',
                        pdfMoney(entry.amount)
                    ])
                    : [['-', '-', '-', 'No transactions in selected view', '-', '-', '-', '-']],
                ...tableTheme,
                columnStyles: {
                    0: { cellWidth: 9 },
                    1: { cellWidth: 21 },
                    2: { cellWidth: 19 },
                    3: { cellWidth: 38 },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 34 },
                    6: { cellWidth: 'auto' },
                    7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
                }
            });

            nextY = addSectionTitle('PROJECT PROFITABILITY', doc.lastAutoTable.finalY + 10);
            const reportProjects = [...filteredProjects, ...completedProjects];
            autoTable(doc, {
                startY: nextY,
                head: [['#', 'Project', 'Client', 'Status', 'Project Value', 'Received', 'Client Due', 'Team Cost', 'Team Paid', 'Company Profit', 'Current Cash']],
                body: reportProjects.length
                    ? reportProjects.map((project, index) => {
                        const metrics = project.metrics || {};
                        return [
                            index + 1,
                            project.name || '-',
                            project.clientName || '-',
                            String(project.status || 'processing').toUpperCase(),
                            pdfMoney(project.clientTotal),
                            pdfMoney(project.clientReceived),
                            pdfMoney(metrics.clientDue),
                            pdfMoney(metrics.developerTotal),
                            pdfMoney(metrics.developerPaid),
                            pdfMoney(metrics.companyTotal),
                            pdfMoney(metrics.currentCash)
                        ];
                    })
                    : [['-', 'No projects available', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
                ...tableTheme,
                styles: { ...tableTheme.styles, fontSize: 7.3 }
            });

            reportProjects.forEach((project, projectIndex) => {
                const members = [
                    ...(project.developers || []).map(member => ({
                        kind: 'Team Member',
                        name: member.name,
                        designation: member.designation,
                        percentage: member.percentage,
                        payable: member.totalPayable,
                        paid: member.paidAmount
                    })),
                    ...(project.companies || []).map(company => ({
                        kind: 'Company',
                        name: company.name,
                        designation: company.designation,
                        percentage: company.percentage,
                        payable: company.totalPayable,
                        paid: company.paidAmount
                    }))
                ];
                if (!members.length) return;

                nextY = addSectionTitle(`PROJECT ${projectIndex + 1}: ${project.name || 'Untitled'} - PAYMENT BREAKDOWN`, doc.lastAutoTable.finalY + 10);
                autoTable(doc, {
                    startY: nextY,
                    head: [['Type', 'Name', 'Designation', 'Share', 'Total Payable', 'Paid', 'Pending']],
                    body: members.map(member => [
                        member.kind,
                        member.name || '-',
                        member.designation || '-',
                        member.percentage ? `${member.percentage}%` : '-',
                        pdfMoney(member.payable),
                        pdfMoney(member.paid),
                        pdfMoney(Math.max(0, Number(member.payable || 0) - Number(member.paid || 0)))
                    ]),
                    ...tableTheme
                });
            });

            const pageCount = doc.getNumberOfPages();
            for (let page = 1; page <= pageCount; page += 1) {
                doc.setPage(page);
                doc.setDrawColor(226, 232, 240);
                doc.line(12, 200, pageWidth - 12, 200);
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(7.5);
                doc.text('Confidential finance report - Adeeb Technology Lab', 12, 205);
                doc.text(`Page ${page} of ${pageCount}`, pageWidth - 12, 205, { align: 'right' });
            }

            const filePeriod = periodMode === 'all' ? 'all-time' : periodMode === 'custom' ? `${startDate}-to-${endDate}` : selectedMonth;
            doc.save(`Adeeb-LMS-Finance-Report-${filePeriod}.pdf`);
        } catch (error) {
            console.error('Finance PDF generation failed:', error);
            alert('Finance report PDF generate nahi ho saka.');
        }
    };

    if (loading) return <Loader message="Loading finance overview..." />;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Income, Expense & Projects</h1><p className="hidden sm:block text-sm text-gray-500 dark:text-slate-400">Cash flow, project profitability and pending clearances in one place.</p></div>
                <div className="ml-auto flex shrink-0 flex-row gap-2">
                    <button onClick={downloadFinanceReport} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"><Download className="h-4 w-4" /><span className="hidden md:inline">Download </span>Report</button>
                    <button onClick={openNewProject} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"><BriefcaseBusiness className="w-4 h-4" /> <span className="hidden sm:inline">Create </span>Project</button>
                    <button onClick={openNew} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Record</button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="md:w-44"><label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">View Data By</label><select value={periodMode} onChange={event => setPeriodMode(event.target.value)} className={`${fieldClass} py-2.5 text-sm font-bold`}><option value="month">Month</option><option value="custom">Date Range</option><option value="all">All Time</option></select></div>
                    {periodMode === 'month' && <div className="md:w-52"><label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">Select Month</label><input type="month" value={selectedMonth} max={freshCurrentMonth()} onChange={event => setSelectedMonth(event.target.value)} className={`${fieldClass} py-2.5 text-sm font-bold`} /></div>}
                    {periodMode === 'custom' && <><div className="md:w-48"><label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">Start Date</label><input type="date" value={startDate} max={endDate || freshToday()} onChange={event => setStartDate(event.target.value)} className={`${fieldClass} py-2.5 text-sm font-bold`} /></div><div className="md:w-48"><label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">End Date</label><input type="date" value={endDate} min={startDate} max={freshToday()} onChange={event => setEndDate(event.target.value)} className={`${fieldClass} py-2.5 text-sm font-bold`} /></div></>}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                {[{ label: 'Total Income', value: summary.totalIncome, icon: TrendingUp, tone: 'text-emerald-500', iconBg: 'bg-emerald-500/10' }, { label: 'Total Expenses', value: summary.totalExpenses, icon: TrendingDown, tone: 'text-rose-500', iconBg: 'bg-rose-500/10' }, { label: 'Available Balance', value: summary.balance, icon: Wallet, tone: 'text-blue-500', iconBg: 'bg-blue-500/10' }, { label: 'Verified Fee Income', value: summary.feeIncome, icon: Landmark, tone: 'text-amber-500', iconBg: 'bg-amber-500/10' }, { label: 'Project Total Cash', value: visibleProjectCash, icon: CircleDollarSign, tone: 'text-cyan-600', iconBg: 'bg-cyan-500/10' }, { label: 'Project Cash Profit', value: visibleCompanyProfit, icon: BriefcaseBusiness, tone: 'text-violet-500', iconBg: 'bg-violet-500/10' }].map(card => (
                    <div key={card.label} className={`flex min-w-0 items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-3 ${card.label === 'Available Balance' ? 'dark:!border-blue-500/40 dark:!bg-blue-950/40' : ''}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                            <card.icon className={`h-4 w-4 ${card.tone}`} />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[8px] font-black uppercase tracking-wide text-gray-400 sm:text-[9px]">{card.label}</p>
                            <p className={`mt-0.5 truncate text-sm font-black text-gray-900 dark:!text-white sm:text-base ${card.label === 'Available Balance' ? 'dark:!text-blue-200' : ''}`}>{money(card.value)}</p>
                        </div>
                    </div>
                ))}
            </div>

            <section className="space-y-3">
                <div><h2 className="text-lg font-black text-gray-900 dark:text-white">Project Portfolio</h2><p className="text-xs text-gray-400">Active projects, collections and team clearance.</p></div>
                <div className="grid lg:grid-cols-2 gap-4">
                    {filteredProjects.map(project => {
                        const metrics = project.metrics || {};
                        const clientProgress = project.clientTotal ? Math.min(100, Math.round(project.clientReceived / project.clientTotal * 100)) : 0;
                        const developerProgress = metrics.developerTotal ? Math.min(100, Math.round(metrics.developerPaid / metrics.developerTotal * 100)) : 100;
                        const expanded = expandedProjects.includes(project._id);
                        return <article key={project._id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 mb-2"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{project.status === 'completed' ? 'Completed' : 'Processing'}</span></div><h3 className="text-lg font-black text-gray-900 dark:text-white">{project.name}</h3><p className="text-xs text-gray-400 mt-1">Client: <span className="font-bold text-gray-600 dark:text-slate-300">{project.clientName}</span></p></div><div className="flex gap-1"><button onClick={() => openEditProject(project)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button><button onClick={() => removeProject(project._id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div></div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><Metric label="Total Cost" value={project.clientTotal} /><Metric label="Team Cost" value={metrics.developerTotal} /><Metric label="Company Profit" value={metrics.companyTotal} tone="text-emerald-600" /><Metric label="Current Cash" value={metrics.currentCash} tone={metrics.currentCash >= 0 ? 'text-blue-600' : 'text-rose-600'} /></div>
                            <div className="mt-4 space-y-3"><div><div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-gray-500">Client received {money(project.clientReceived)}</span><span className="text-red-600">Client pending {money(metrics.clientDue)}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${clientProgress}%` }} /></div></div><div><div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-gray-500">Team paid {money(metrics.developerPaid)}</span><span className="text-red-600">Team pending {money(metrics.developerDue)}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${developerProgress}%` }} /></div></div></div>
                            <button onClick={() => setExpandedProjects(previous => expanded ? previous.filter(projectId => projectId !== project._id) : [...previous, project._id])} className="mt-4 w-full flex items-center justify-between text-xs font-black text-gray-500 hover:text-primary"><span className="flex items-center gap-2"><Users className="w-4 h-4" /> {project.developers?.length || 0} Team Member(s) • {project.companies?.length || 0} Company(s)</span>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                            {expanded && <div className="mt-3 space-y-3"><div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-300">Team Members</p>{(project.developers || []).map(developer => <div key={developer._id || developer.name} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-3"><div><p className="text-sm font-bold dark:text-white">{developer.name}</p>{developer.designation && <p className="text-[10px] font-bold text-primary">{developer.designation}</p>}<p className="text-[10px] text-gray-400">Payable {money(developer.totalPayable)}{developer.percentage ? ` • ${developer.percentage}%` : ''}</p></div><div className="text-right"><p className="text-xs font-black text-emerald-600">Paid {money(developer.paidAmount)}</p><p className="text-[10px] text-amber-600">Due {money(Math.max(0, developer.totalPayable - developer.paidAmount))}</p></div></div>)}</div>{(project.companies || []).length > 0 && <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-300">Companies</p>{project.companies.map(company => <div key={company._id || company.name} className="rounded-xl bg-orange-50 dark:!bg-slate-800 border border-orange-100 dark:!border-emerald-500/40 p-3 shadow-sm"><p className="text-sm font-extrabold text-gray-900 dark:!text-emerald-200">{company.name}</p>{company.designation && <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600 dark:!text-amber-300">{company.designation}</p>}<p className="mt-1 text-[11px] font-bold text-gray-700 dark:!text-slate-100"><span className="text-emerald-700 dark:!text-emerald-300">Profit</span> {money(company.totalPayable)}{company.percentage ? <span className="text-gray-500 dark:!text-slate-300"> {`• ${company.percentage}%`}</span> : ''}</p></div>)}</div>}</div>}
                        </article>;
                    })}
                </div>
                {!filteredProjects.length && <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center"><BriefcaseBusiness className="w-8 h-8 mx-auto text-gray-300 mb-2" /><p className="text-sm font-bold text-gray-400">No projects in this view.</p><button onClick={openNewProject} className="mt-3 text-xs font-black text-primary">Create first project</button></div>}
            </section>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search transaction history..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 outline-none focus:border-primary text-sm" />
                </div>
                <select value={historyProjectFilter} onChange={event => setHistoryProjectFilter(event.target.value)} className="sm:w-64 px-3 py-3 rounded-xl bg-white dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 text-sm font-bold">
                    <option value="all">All Projects</option>
                    <option value="general">General Records</option>
                    {projects.map(project => <option key={project._id} value={project._id}>📁 {project.name}</option>)}
                </select>
            </div>

            <div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden"><div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="font-black text-gray-900 dark:text-white">Transaction History</h2>{filteredEntries.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-black text-gray-500">{filteredEntries.length} records</span>}</div><div className="flex items-center gap-3">{filteredEntries.length > 0 && <div className="flex items-center gap-2 text-[10px] font-black"><span className="text-emerald-600">+{money(filteredIncome)}</span><span className="text-gray-300">|</span><span className="text-rose-600">-{money(filteredExpense)}</span><span className="text-gray-300">|</span><span className="text-blue-600">{money(filteredTotal)}</span></div>}<div className="flex gap-2"><select value={filter} onChange={event => setFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-600 text-xs font-bold"><option value="all">All Records</option><option value="income">Income</option><option value="expense">Expenses</option></select><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-600 text-xs font-bold"><option value="all">All Categories</option>{availableCategories.map(category => <option key={category.name} value={category.name}>{category.name} ({category.count})</option>)}</select></div></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-800 text-gray-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Amount</th><th className="p-3" /></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{filteredEntries.map(entry => <tr key={entry._id} className="dark:text-slate-200"><td className="p-3 whitespace-nowrap">{new Date(entry.transactionDate).toLocaleDateString('en-GB')}</td><td className="p-3"><p className="font-bold">{entry.title}</p><p className="text-xs text-gray-400">{entry.description || 'No description'}</p></td><td className="p-3"><span className="inline-flex items-center gap-2"><span>{getCategoryIcon(entry.category)}</span>{entry.category}</span></td><td className={`p-3 text-right font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type === 'income' ? '+' : '-'} {money(entry.amount)}</td><td className="p-3"><div className="flex justify-end gap-1"><button onClick={() => openEdit(entry)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => removeEntry(entry._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table>{!filteredEntries.length && <p className="p-10 text-center text-gray-400">No records match these filters.</p>}</div></div>
            </div>

            <section className="space-y-3">
                <div><h2 className="text-lg font-black text-gray-900 dark:text-white">Completed Projects</h2><p className="text-xs text-gray-400">Projects automatically move here when Team Pending reaches Rs 0.</p></div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {completedProjects.map(project => <article key={project._id} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">Completed</span><h3 className="mt-2 font-black text-gray-900 dark:text-white">{project.name}</h3></div><div className="flex gap-1"><button onClick={() => openEditProject(project)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button><button onClick={() => removeProject(project._id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div></div><div className="grid grid-cols-3 gap-2 mt-4"><Metric label="Total Cost" value={project.clientTotal} /><Metric label="Team Cost" value={project.metrics?.developerTotal} /><Metric label="Company Profit" value={project.metrics?.companyTotal} tone="text-emerald-600" /></div></article>)}
                </div>
                {!completedProjects.length && <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center text-sm font-bold text-gray-400">No completed projects yet.</div>}
            </section>

            {showForm && <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveEntry} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><h2 className="text-lg font-black dark:text-white">{editingId ? 'Edit Record' : 'Add Finance Record'}</h2><button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 dark:text-white" /></button></div><div className="grid grid-cols-2 gap-3"><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className={fieldClass}><option value="expense">📤 Expense</option><option value="income">📥 Income</option></select><input required inputMode="numeric" placeholder="Amount" value={form.amount} onChange={event => setForm({ ...form, amount: formatAmountInput(event.target.value) })} className={fieldClass} /></div><input required placeholder="Record title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={fieldClass} /><div className="grid grid-cols-2 gap-3"><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className={fieldClass}>{categories.map(category => <option key={category} value={category}>{getCategoryIcon(category)} {category}</option>)}</select><input type="date" required value={form.transactionDate} onChange={event => setForm({ ...form, transactionDate: event.target.value })} className={fieldClass} /></div><select value={form.project} onChange={event => setForm({ ...form, project: event.target.value, paymentTarget: '' })} className={fieldClass}><option value="">No project / General record</option>{activeProjects.map(project => <option key={project._id} value={project._id}>📁 {project.name}</option>)}</select>{selectedPaymentProject && <select required value={form.paymentTarget} onChange={event => { const target = event.target.value; setForm({ ...form, paymentTarget: target, type: target === 'client' ? 'income' : target.startsWith('team:') || target.startsWith('company:') ? 'expense' : form.type }); }} className={fieldClass}><option value="">Select payment for</option><option value="client">Client — {selectedPaymentProject.clientName}</option>{(selectedPaymentProject.developers || []).map(member => <option key={member._id} value={`team:${member._id}`}>Team Member — {member.name}{member.designation ? ` (${member.designation})` : ''}</option>)}{(selectedPaymentProject.companies || []).map(company => <option key={company._id} value={`company:${company._id}`}>Company — {company.name}{company.designation ? ` (${company.designation})` : ''}</option>)}</select>}{form.category === 'Other' && <input required placeholder="Custom category name" value={form.customCategory} onChange={event => setForm({ ...form, customCategory: event.target.value })} className={fieldClass} />}<textarea rows="3" placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={fieldClass} /><button disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-black disabled:opacity-50">{saving ? 'Saving...' : 'Save Record'}</button></form></div>}

            {showProjectForm && <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveProject} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-lg font-black dark:text-white">{editingProjectId ? 'Edit Project' : 'Create Project'}</h2><p className="text-xs text-gray-400">Track project value, team cost and your expected profit.</p></div><button type="button" onClick={() => setShowProjectForm(false)}><X className="w-5 h-5 dark:text-white" /></button></div><div className="grid md:grid-cols-2 gap-3"><input required placeholder="Project name" value={projectForm.name} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} className={fieldClass} /><input required placeholder="Client name" value={projectForm.clientName} onChange={event => setProjectForm({ ...projectForm, clientName: event.target.value })} className={fieldClass} /><input required inputMode="tel" placeholder="Client phone number" value={projectForm.clientPhone} onChange={event => setProjectForm({ ...projectForm, clientPhone: event.target.value })} className={fieldClass} /><input required inputMode="numeric" placeholder="Client total amount" value={projectForm.clientTotal} onChange={event => updateProjectTotal(event.target.value)} className={fieldClass} /><input type="date" required value={projectForm.startDate} onChange={event => setProjectForm({ ...projectForm, startDate: event.target.value })} className={fieldClass} /></div><div className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4"><div className="flex items-center justify-between mb-3"><div><h3 className="font-black dark:text-white">Team Members</h3><p className="text-[10px] text-gray-400">Enter percentage or Rs amount; the other value calculates automatically.</p></div><button type="button" onClick={() => setProjectForm(previous => ({ ...previous, developers: [...previous.developers, emptyDeveloper()] }))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center gap-2"><UserRoundPlus className="w-4 h-4" /> Add Team Member</button></div><div className="space-y-2">{projectForm.developers.map((developer, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_.7fr_1fr_auto] gap-2"><input required placeholder="Name" value={developer.name} onChange={event => updateDeveloper(index, 'name', event.target.value)} className={fieldClass} /><input required placeholder="Designation" value={developer.designation} onChange={event => updateDeveloper(index, 'designation', event.target.value)} className={fieldClass} /><input required inputMode="decimal" placeholder="Percentage %" value={developer.percentage} onChange={event => updateDeveloperShare(index, 'percentage', event.target.value)} className={fieldClass} /><input required inputMode="numeric" placeholder="Total payable (Rs)" value={developer.totalPayable} onChange={event => updateDeveloperShare(index, 'totalPayable', event.target.value)} className={fieldClass} /><button type="button" disabled={projectForm.developers.length === 1} onClick={() => setProjectForm(previous => ({ ...previous, developers: previous.developers.filter((_, developerIndex) => developerIndex !== index) }))} className="p-3 text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>)}</div></div><div className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4"><div className="flex items-center justify-between mb-3"><div><h3 className="font-black dark:text-white">Companies</h3><p className="text-[10px] text-gray-400">Add companies with the same percentage or Rs calculation.</p></div><button type="button" onClick={() => setProjectForm(previous => ({ ...previous, companies: [...previous.companies, emptyCompany()] }))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center gap-2"><UserRoundPlus className="w-4 h-4" /> Add Company</button></div><div className="space-y-2">{projectForm.companies.map((company, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_.7fr_1fr_auto] gap-2"><input required placeholder="Company name" value={company.name} onChange={event => updateCompany(index, 'name', event.target.value)} className={fieldClass} /><input required placeholder="Designation / Service" value={company.designation} onChange={event => updateCompany(index, 'designation', event.target.value)} className={fieldClass} /><input required inputMode="decimal" placeholder="Percentage %" value={company.percentage} onChange={event => updateCompanyShare(index, 'percentage', event.target.value)} className={fieldClass} /><input required inputMode="numeric" placeholder="Total payable (Rs)" value={company.totalPayable} onChange={event => updateCompanyShare(index, 'totalPayable', event.target.value)} className={fieldClass} /><button type="button" disabled={projectForm.companies.length === 1} onClick={() => setProjectForm(previous => ({ ...previous, companies: previous.companies.filter((_, companyIndex) => companyIndex !== index) }))} className="p-3 text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>)}</div></div><div className={`rounded-2xl border p-4 flex items-center justify-between ${projectRemainingValue < 0 ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20'}`}><div><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Remaining Amount</p><p className="text-xs text-gray-400 mt-1">Client Total − Team Payable − Company Payable</p></div><p className={`text-xl font-black ${projectRemainingValue < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(projectRemainingValue)}</p></div><textarea rows="3" placeholder="Project notes / scope" value={projectForm.description} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} className={fieldClass} /><button disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-black disabled:opacity-50">{saving ? 'Saving...' : editingProjectId ? 'Update Project' : 'Create Project'}</button></form></div>}
        </div>
    );
};

export default ExpenseManagement;
