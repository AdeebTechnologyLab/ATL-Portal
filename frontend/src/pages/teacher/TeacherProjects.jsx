import { useState, useEffect } from 'react';
import { BriefcaseBusiness, ChevronDown, ChevronUp, Users, CheckCircle2, Pencil, X, Trash2, UserRoundPlus } from 'lucide-react';
import { teacherFinanceAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';
import { showToast } from '../../utils/customToast';

const money = value => `Rs ${Number(value || 0).toLocaleString()}`;
const parseAmount = value => Number(String(value || '').replace(/,/g, ''));
const parsePercentage = value => Number(String(value || '').replace('%', ''));
const formatAmountInput = value => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits).toLocaleString() : '';
};
const fieldClass = 'w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none focus:border-primary';
const emptyDeveloper = () => ({ name: '', designation: '', percentage: '', totalPayable: '', paidAmount: '' });
const emptyCompany = () => ({ name: '', designation: '', percentage: '', totalPayable: '', paidAmount: '' });
const freshToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Metric = ({ label, value, tone = 'text-gray-900 dark:text-white' }) => (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`mt-1 text-sm font-black ${tone}`}>{money(value)}</p>
    </div>
);

const TeacherProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState([]);
    const [editingProject, setEditingProject] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const loadProjects = async () => {
        try {
            setError(null);
            const res = await teacherFinanceAPI.getAssignedProjects();
            setProjects(res.data.data || []);
        } catch (err) {
            console.error('Failed to load projects:', err);
            setError(err.response?.data?.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProjects(); }, []);

    const toggleExpand = projectId => {
        setExpandedProjects(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
    };

    const openEdit = project => {
        setEditingProject(project);
        setEditForm({
            name: project.name || '',
            clientName: project.clientName || '',
            clientPhone: project.clientPhone || '',
            clientTotal: formatAmountInput(project.clientTotal),
            clientReceived: formatAmountInput(project.clientReceived),
            developers: (project.developers || []).length ? project.developers.map(d => ({
                name: d.name || '',
                designation: d.designation || '',
                percentage: `${d.percentage || 0}%`,
                totalPayable: formatAmountInput(d.totalPayable),
                paidAmount: formatAmountInput(d.paidAmount)
            })) : [emptyDeveloper()],
            companies: (project.companies || []).length ? project.companies.map(c => ({
                name: c.name || '',
                designation: c.designation || '',
                percentage: `${c.percentage || 0}%`,
                totalPayable: formatAmountInput(c.totalPayable),
                paidAmount: formatAmountInput(c.paidAmount)
            })) : [emptyCompany()],
            status: project.status || 'processing',
            startDate: new Date(project.startDate).toISOString().slice(0, 10),
            completionDate: project.completionDate ? new Date(project.completionDate).toISOString().slice(0, 10) : '',
            description: project.description || ''
        });
    };

    const updateEditField = (key, value) => setEditForm(prev => ({ ...prev, [key]: value }));

    const updateDeveloper = (index, key, value) => setEditForm(prev => ({
        ...prev,
        developers: prev.developers.map((d, i) => i === index ? { ...d, [key]: value } : d)
    }));

    const updateDeveloperShare = (index, key, value) => setEditForm(prev => {
        const clientTotal = parseAmount(prev.clientTotal);
        const developers = prev.developers.map((d, i) => {
            if (i !== index) return d;
            if (key === 'percentage') {
                const pct = value.replace(/[^\d.]/g, '');
                const totalPayable = clientTotal && pct !== '' ? formatAmountInput(Math.round(clientTotal * Number(pct) / 100)) : '';
                return { ...d, percentage: pct === '' ? '' : `${pct}%`, totalPayable };
            }
            const totalPayable = formatAmountInput(value);
            const amount = parseAmount(totalPayable);
            const percentage = clientTotal ? `${Number((amount / clientTotal * 100).toFixed(2))}%` : '';
            return { ...d, totalPayable, percentage };
        });
        return { ...prev, developers };
    });

    const updateCompany = (index, key, value) => setEditForm(prev => ({
        ...prev,
        companies: prev.companies.map((c, i) => i === index ? { ...c, [key]: value } : c)
    }));

    const updateCompanyShare = (index, key, value) => setEditForm(prev => {
        const clientTotal = parseAmount(prev.clientTotal);
        const companies = prev.companies.map((c, i) => {
            if (i !== index) return c;
            if (key === 'percentage') {
                const pct = value.replace(/[^\d.]/g, '');
                const totalPayable = clientTotal && pct !== '' ? formatAmountInput(Math.round(clientTotal * Number(pct) / 100)) : '';
                return { ...c, percentage: pct === '' ? '' : `${pct}%`, totalPayable };
            }
            const totalPayable = formatAmountInput(value);
            const amount = parseAmount(totalPayable);
            const percentage = clientTotal ? `${Number((amount / clientTotal * 100).toFixed(2))}%` : '';
            return { ...c, totalPayable, percentage };
        });
        return { ...prev, companies };
    });

    const updateProjectTotal = value => setEditForm(prev => {
        const clientTotal = formatAmountInput(value);
        const amount = parseAmount(clientTotal);
        const developers = prev.developers.map(d => d.percentage === '' ? d : {
            ...d,
            totalPayable: amount ? formatAmountInput(Math.round(amount * parsePercentage(d.percentage) / 100)) : ''
        });
        const companies = prev.companies.map(c => c.percentage === '' ? c : {
            ...c,
            totalPayable: amount ? formatAmountInput(Math.round(amount * parsePercentage(c.percentage) / 100)) : ''
        });
        return { ...prev, clientTotal, developers, companies };
    });

    const projectRemainingValue = parseAmount(editForm.clientTotal) - (editForm.developers || []).reduce((sum, d) => sum + parseAmount(d.totalPayable), 0) - (editForm.companies || []).reduce((sum, c) => sum + parseAmount(c.totalPayable), 0);

    const saveEdit = async () => {
        setSaving(true);
        try {
            await teacherFinanceAPI.updateProject(editingProject._id, {
                name: editForm.name,
                clientName: editForm.clientName,
                clientPhone: editForm.clientPhone,
                clientTotal: parseAmount(editForm.clientTotal),
                clientReceived: parseAmount(editForm.clientReceived),
                developers: editForm.developers.filter(d => d.name.trim()).map(d => ({
                    name: d.name.trim(),
                    designation: d.designation.trim(),
                    percentage: parsePercentage(d.percentage),
                    totalPayable: parseAmount(d.totalPayable),
                    paidAmount: parseAmount(d.paidAmount)
                })),
                companies: editForm.companies.filter(c => c.name.trim()).map(c => ({
                    name: c.name.trim(),
                    designation: c.designation.trim(),
                    percentage: parsePercentage(c.percentage),
                    totalPayable: parseAmount(c.totalPayable),
                    paidAmount: parseAmount(c.paidAmount)
                })),
                status: editForm.status,
                startDate: editForm.startDate,
                completionDate: editForm.completionDate || null,
                description: editForm.description
            });
            showToast.success('Project updated successfully');
            setEditingProject(null);
            await loadProjects();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader message="Loading your projects..." />;

    const activeProjects = projects.filter(p => p.status !== 'completed');
    const completedProjects = projects.filter(p => p.status === 'completed');

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">My Projects</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">Projects assigned to you. You can edit all project details.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-red-600 font-bold text-sm">{error}</p>
                    <button onClick={loadProjects} className="mt-2 text-xs font-black text-primary">Retry</button>
                </div>
            )}

            {activeProjects.length > 0 && <section className="space-y-3">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Active Projects</h2>
                <div className="grid lg:grid-cols-2 gap-4">
                    {activeProjects.map(project => {
                        const metrics = project.metrics || {};
                        const clientProgress = project.clientTotal ? Math.min(100, Math.round(project.clientReceived / project.clientTotal * 100)) : 0;
                        const developerProgress = metrics.developerTotal ? Math.min(100, Math.round(metrics.developerPaid / metrics.developerTotal * 100)) : 100;
                        const expanded = expandedProjects.includes(project._id);
                        return (
                            <article key={project._id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{project.status === 'completed' ? 'Completed' : 'Processing'}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{project.name}</h3>
                                        <p className="text-xs text-gray-400 mt-1">Client: <span className="font-bold text-gray-600 dark:text-slate-300">{project.clientName}</span></p>
                                    </div>
                                    <button onClick={() => openEdit(project)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-primary" title="Edit Project">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                                    <Metric label="Total Cost" value={project.clientTotal} />
                                    <Metric label="Team Cost" value={metrics.developerTotal} />
                                    <Metric label="Company Profit" value={metrics.companyTotal} tone="text-emerald-600" />
                                    <Metric label="Current Cash" value={metrics.currentCash} tone={metrics.currentCash >= 0 ? 'text-blue-600' : 'text-rose-600'} />
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold mb-1">
                                            <span className="text-gray-500">Client received {money(project.clientReceived)}</span>
                                            <span className="text-red-600">Client pending {money(metrics.clientDue)}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${clientProgress}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold mb-1">
                                            <span className="text-gray-500">Team paid {money(metrics.developerPaid)}</span>
                                            <span className="text-red-600">Team pending {money(metrics.developerDue)}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${developerProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => toggleExpand(project._id)} className="mt-4 w-full flex items-center justify-between text-xs font-black text-gray-500 hover:text-primary">
                                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {project.developers?.length || 0} Team Member(s) • {project.companies?.length || 0} Company(s)</span>
                                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {expanded && <div className="mt-3 space-y-3">
                                    {(project.developers || []).length > 0 && <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Team Members</p>
                                        {project.developers.map(developer => (
                                            <div key={developer._id || developer.name} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                                                <div>
                                                    <p className="text-sm font-bold dark:text-white">{developer.name}</p>
                                                    {developer.designation && <p className="text-[10px] font-bold text-primary">{developer.designation}</p>}
                                                    <p className="text-[10px] text-gray-400">Payable {money(developer.totalPayable)}{developer.percentage ? ` • ${developer.percentage}%` : ''}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-emerald-600">Paid {money(developer.paidAmount)}</p>
                                                    <p className="text-[10px] text-amber-600">Due {money(Math.max(0, developer.totalPayable - developer.paidAmount))}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>}
                                    {(project.companies || []).length > 0 && <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Companies</p>
                                        {project.companies.map(company => (
                                            <div key={company._id || company.name} className="rounded-xl bg-orange-50 dark:!bg-slate-800 border border-orange-100 dark:!border-emerald-500/40 p-3 shadow-sm">
                                                <p className="text-sm font-extrabold text-gray-900 dark:!text-emerald-200">{company.name}</p>
                                                {company.designation && <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600 dark:!text-amber-300">{company.designation}</p>}
                                                <p className="mt-1 text-[11px] font-bold text-gray-700 dark:!text-slate-100"><span className="text-emerald-700 dark:!text-emerald-300">Profit</span> {money(company.totalPayable)}{company.percentage ? <span className="text-gray-500 dark:!text-slate-300"> {`• ${company.percentage}%`}</span> : ''}</p>
                                            </div>
                                        ))}
                                    </div>}
                                </div>}
                            </article>
                        );
                    })}
                </div>
            </section>}

            {completedProjects.length > 0 && <section className="space-y-3">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Completed Projects</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {completedProjects.map(project => (
                        <article key={project._id} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">Completed</span>
                                    <h3 className="mt-2 font-black text-gray-900 dark:text-white">{project.name}</h3>
                                </div>
                                <button onClick={() => openEdit(project)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-primary" title="Edit Project">
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <Metric label="Total Cost" value={project.clientTotal} />
                                <Metric label="Team Cost" value={project.metrics?.developerTotal} />
                                <Metric label="Company Profit" value={project.metrics?.companyTotal} tone="text-emerald-600" />
                            </div>
                        </article>
                    ))}
                </div>
            </section>}

            {!projects.length && (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center">
                    <BriefcaseBusiness className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-400">No projects assigned to you yet.</p>
                </div>
            )}

            {/* Edit Modal - Full like Admin */}
            {editingProject && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={e => { e.preventDefault(); saveEdit(); }} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl">
                        <div className="flex justify-between">
                            <div>
                                <h2 className="text-lg font-black dark:text-white">Edit Project</h2>
                                <p className="text-xs text-gray-400">Track project value, team cost and your expected profit.</p>
                            </div>
                            <button type="button" onClick={() => setEditingProject(null)}><X className="w-5 h-5 dark:text-white" /></button>
                        </div>

                        {/* Project Info */}
                        <div className="grid md:grid-cols-2 gap-3">
                            <input placeholder="Project name" value={editForm.name} onChange={e => updateEditField('name', e.target.value)} className={fieldClass} />
                            <input placeholder="Client name" value={editForm.clientName} onChange={e => updateEditField('clientName', e.target.value)} className={fieldClass} />
                            <input inputMode="tel" placeholder="Client phone number" value={editForm.clientPhone} onChange={e => updateEditField('clientPhone', e.target.value)} className={fieldClass} />
                            <input inputMode="numeric" placeholder="Client total amount" value={editForm.clientTotal} onChange={e => updateProjectTotal(e.target.value)} className={fieldClass} />
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Start Date</label>
                                <input type="date" value={editForm.startDate} onChange={e => updateEditField('startDate', e.target.value)} className={fieldClass} />
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-black dark:text-white">Team Members</h3>
                                    <p className="text-[10px] text-gray-400">Enter percentage or Rs amount; the other value calculates automatically.</p>
                                </div>
                                <button type="button" onClick={() => setEditForm(prev => ({ ...prev, developers: [...prev.developers, emptyDeveloper()] }))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center gap-2">
                                    <UserRoundPlus className="w-4 h-4" /> Add Team Member
                                </button>
                            </div>
                            <div className="space-y-2">
                                {editForm.developers?.map((developer, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_.7fr_1fr_auto] gap-2">
                                        <input placeholder="Name" value={developer.name} onChange={e => updateDeveloper(index, 'name', e.target.value)} className={fieldClass} />
                                        <input placeholder="Designation" value={developer.designation} onChange={e => updateDeveloper(index, 'designation', e.target.value)} className={fieldClass} />
                                        <input inputMode="decimal" placeholder="Percentage %" value={developer.percentage} onChange={e => updateDeveloperShare(index, 'percentage', e.target.value)} className={fieldClass} />
                                        <input inputMode="numeric" placeholder="Total payable (Rs)" value={developer.totalPayable} onChange={e => updateDeveloperShare(index, 'totalPayable', e.target.value)} className={fieldClass} />
                                        <button type="button" disabled={editForm.developers.length === 1} onClick={() => setEditForm(prev => ({ ...prev, developers: prev.developers.filter((_, i) => i !== index) }))} className="p-3 text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Companies */}
                        <div className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-black dark:text-white">Companies</h3>
                                    <p className="text-[10px] text-gray-400">Add companies with the same percentage or Rs calculation.</p>
                                </div>
                                <button type="button" onClick={() => setEditForm(prev => ({ ...prev, companies: [...prev.companies, emptyCompany()] }))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center gap-2">
                                    <UserRoundPlus className="w-4 h-4" /> Add Company
                                </button>
                            </div>
                            <div className="space-y-2">
                                {editForm.companies?.map((company, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_.7fr_1fr_auto] gap-2">
                                        <input placeholder="Company name" value={company.name} onChange={e => updateCompany(index, 'name', e.target.value)} className={fieldClass} />
                                        <input placeholder="Designation / Service" value={company.designation} onChange={e => updateCompany(index, 'designation', e.target.value)} className={fieldClass} />
                                        <input inputMode="decimal" placeholder="Percentage %" value={company.percentage} onChange={e => updateCompanyShare(index, 'percentage', e.target.value)} className={fieldClass} />
                                        <input inputMode="numeric" placeholder="Total payable (Rs)" value={company.totalPayable} onChange={e => updateCompanyShare(index, 'totalPayable', e.target.value)} className={fieldClass} />
                                        <button type="button" disabled={editForm.companies.length === 1} onClick={() => setEditForm(prev => ({ ...prev, companies: prev.companies.filter((_, i) => i !== index) }))} className="p-3 text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Remaining Amount */}
                        <div className={`rounded-2xl border p-4 flex items-center justify-between ${projectRemainingValue < 0 ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20'}`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Remaining Amount</p>
                                <p className="text-xs text-gray-400 mt-1">Client Total - Team Payable - Company Payable</p>
                            </div>
                            <p className={`text-xl font-black ${projectRemainingValue < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(projectRemainingValue)}</p>
                        </div>

                        {/* Description */}
                        <textarea rows="3" placeholder="Project notes / scope" value={editForm.description} onChange={e => updateEditField('description', e.target.value)} className={fieldClass} />

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEditingProject(null)} className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-sm">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TeacherProjects;
