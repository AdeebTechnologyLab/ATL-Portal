import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap, BookOpen, Briefcase, Users, Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { registrationPageAPI } from '../../services/api';
import toast from 'react-hot-toast';

const formTypes = [
    { id: 'student', label: 'Student', icon: BookOpen, color: 'blue' },
    { id: 'intern', label: 'Intern', icon: Users, color: 'emerald' },
    { id: 'job', label: 'Job', icon: Briefcase, color: 'amber' },
    { id: 'teacher', label: 'Teacher', icon: GraduationCap, color: 'purple' }
];

const colorClasses = {
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', ring: 'ring-blue-500' },
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', ring: 'ring-emerald-500' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500', ring: 'ring-amber-500' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', ring: 'ring-purple-500' }
};

const RegistrationPages = () => {
    const [activeTab, setActiveTab] = useState('student');
    const [pages, setPages] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await registrationPageAPI.getAll();
            // Deep clone to strip MongoDB ObjectId references
            const data = JSON.parse(JSON.stringify(res.data.data));
            console.log('📋 Registration Pages loaded:', Object.keys(data));
            setPages(data);
        } catch (error) {
            toast.error('Failed to load registration pages');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (idx) => {
        setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const updateField = (path, value) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            const keys = path.split('.');
            let obj = page;
            for (let i = 0; i < keys.length - 1; i++) {
                if (Array.isArray(obj[keys[i]])) {
                    obj[keys[i]] = [...obj[keys[i]]];
                    obj = obj[keys[i]];
                } else {
                    obj[keys[i]] = { ...obj[keys[i]] };
                    obj = obj[keys[i]];
                }
            }
            obj[keys[keys.length - 1]] = value;
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const updateSectionTitle = (sectionIdx, value) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = [...page.sections];
            page.sections[sectionIdx] = { ...page.sections[sectionIdx], title: value };
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const updateSectionItem = (sectionIdx, itemIdx, value) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = [...page.sections];
            page.sections[sectionIdx] = { ...page.sections[sectionIdx] };
            page.sections[sectionIdx].items = [...page.sections[sectionIdx].items];
            page.sections[sectionIdx].items[itemIdx] = value;
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const addSectionItem = (sectionIdx) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = [...page.sections];
            page.sections[sectionIdx] = { ...page.sections[sectionIdx] };
            page.sections[sectionIdx].items = [...page.sections[sectionIdx].items, ''];
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const removeSectionItem = (sectionIdx, itemIdx) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = [...page.sections];
            page.sections[sectionIdx] = { ...page.sections[sectionIdx] };
            page.sections[sectionIdx].items = page.sections[sectionIdx].items.filter((_, i) => i !== itemIdx);
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const addSection = () => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = [...page.sections, { title: 'New Section', type: 'list', items: [''] }];
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const removeSection = (sectionIdx) => {
        setPages(prev => {
            const newPages = { ...prev };
            const page = { ...newPages[activeTab] };
            page.sections = page.sections.filter((_, i) => i !== sectionIdx);
            newPages[activeTab] = page;
            return newPages;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await registrationPageAPI.update(activeTab, pages[activeTab]);
            toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} page updated!`);
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const currentPage = pages[activeTab];
    const currentColor = formTypes.find(f => f.id === activeTab)?.color || 'blue';
    const cc = colorClasses[currentColor];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    Registration Forms
                </h1>
                <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                    Edit the left-side content shown on each registration page
                </p>
            </div>

            {/* Tabs */}
            <div className="grid w-full grid-cols-4 gap-1 sm:flex sm:w-fit sm:gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {formTypes.map((ft) => {
                    const Icon = ft.icon;
                    const isActive = activeTab === ft.id;
                    const c = colorClasses[ft.color];
                    return (
                        <button
                            key={ft.id}
                            onClick={() => {
                                console.log('📌 Switching to tab:', ft.id, 'Page data:', pages[ft.id] ? 'found' : 'missing');
                                setActiveTab(ft.id);
                                setExpandedSections({});
                            }}
                            className={`min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium transition-all ${
                                isActive
                                    ? `${c.bg} text-white shadow-md`
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {ft.label}
                        </button>
                    );
                })}
            </div>

            {currentPage && (
                <div key={activeTab} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Left Column - Editable Fields */}
                    <div className="space-y-4">
                        {/* Announcement */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${cc.bg} animate-pulse`} />
                                Announcement
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Heading</label>
                                    <input
                                        type="text"
                                        value={currentPage.announcement?.heading || ''}
                                        onChange={(e) => updateField('announcement.heading', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Text</label>
                                    <textarea
                                        value={currentPage.announcement?.text || ''}
                                        onChange={(e) => updateField('announcement.text', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Status Info</h3>
                            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status Value</label>
                                    <input
                                        type="text"
                                        value={currentPage.statusInfo?.value || ''}
                                        onChange={(e) => updateField('statusInfo.value', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status Color</label>
                                    <select
                                        value={currentPage.statusInfo?.valueColor || 'green'}
                                        onChange={(e) => updateField('statusInfo.valueColor', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    >
                                        <option value="green">Green (Open)</option>
                                        <option value="red">Red (Closed)</option>
                                        <option value="yellow">Yellow (Pending)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Date Label</label>
                                    <input
                                        type="text"
                                        value={currentPage.statusInfo?.dateLabel || ''}
                                        onChange={(e) => updateField('statusInfo.dateLabel', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Date Value</label>
                                    <input
                                        type="text"
                                        value={currentPage.statusInfo?.dateValue || ''}
                                        onChange={(e) => updateField('statusInfo.dateValue', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Type Badge */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Type Badge</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Text</label>
                                    <input
                                        type="text"
                                        value={currentPage.typeBadge?.text || ''}
                                        onChange={(e) => updateField('typeBadge.text', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Color</label>
                                    <select
                                        value={currentPage.typeBadge?.color || 'primary'}
                                        onChange={(e) => updateField('typeBadge.color', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    >
                                        <option value="primary">Primary</option>
                                        <option value="blue">Blue</option>
                                        <option value="emerald">Emerald</option>
                                        <option value="amber">Amber</option>
                                        <option value="purple">Purple</option>
                                        <option value="fuchsia">Fuchsia</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Sections */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Content Sections</h3>
                            <button
                                onClick={addSection}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add Section
                            </button>
                        </div>

                        {currentPage.sections?.map((section, sIdx) => (
                            <div key={sIdx} className="min-w-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {/* Section Header */}
                                <div
                                    className="flex min-w-0 items-center justify-between gap-2 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                    onClick={() => toggleSection(sIdx)}
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                        <span className={`w-8 h-8 rounded-lg ${cc.light} dark:bg-gray-700 flex items-center justify-center text-sm font-bold ${cc.text}`}>
                                            {sIdx + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={(e) => { e.stopPropagation(); updateSectionTitle(sIdx, e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="min-w-0 w-full font-medium text-sm sm:text-base text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSection(sIdx); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {expandedSections[sIdx] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Section Content */}
                                {expandedSections[sIdx] && (
                                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                                        <div className="flex items-center gap-2 mb-3">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type:</label>
                                            <select
                                                value={section.type}
                                                onChange={(e) => {
                                                    setPages(prev => {
                                                        const newPages = { ...prev };
                                                        const page = { ...newPages[activeTab] };
                                                        page.sections = [...page.sections];
                                                        page.sections[sIdx] = { ...page.sections[sIdx], type: e.target.value };
                                                        newPages[activeTab] = page;
                                                        return newPages;
                                                    });
                                                }}
                                                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            >
                                                <option value="list">List (Checkmarks)</option>
                                                <option value="grid">Grid (Cards)</option>
                                                <option value="badges">Badges</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            {section.items.map((item, iIdx) => (
                                                <div key={iIdx} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-5">{iIdx + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => updateSectionItem(sIdx, iIdx, e.target.value)}
                                                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                        placeholder="Enter item text..."
                                                    />
                                                    <button
                                                        onClick={() => removeSectionItem(sIdx, iIdx)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => addSectionItem(sIdx)}
                                            className="mt-3 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-primary bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Item
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(!currentPage.sections || currentPage.sections.length === 0) && (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No sections yet. Click "Add Section" to start.</p>
                            </div>
                        )}
                    </div>
                </div>

                    {/* Save only after all editable content */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-sm text-white ${cc.bg} hover:opacity-90 transition-all disabled:opacity-50 shadow-lg`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default RegistrationPages;
