import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Pencil, Trash2, X, Copy, Check, Eye, EyeOff,
    Banknote, Building2, User, Link2, Palette, Loader2
} from 'lucide-react';
import { paymentMethodAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#22c55e'
];

const emptyForm = {
    bankName: '',
    accountName: '',
    accountNumber: '',
    imageLink: '',
    color: '#10b981',
    isActive: true
};

const fieldClass = 'w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none focus:border-primary transition-colors';
const labelClass = 'text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5';

const AdminFeeMethods = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadMethods = async () => {
        try {
            const res = await paymentMethodAPI.getAll();
            setMethods(res.data.data || []);
        } catch (err) {
            console.error('Error loading payment methods:', err);
            toast.error('Failed to load payment methods');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMethods(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
            toast.error('Please fill all required fields');
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await paymentMethodAPI.update(editingId, form);
                toast.success('Payment method updated');
            } else {
                await paymentMethodAPI.create({ ...form, order: methods.length });
                toast.success('Payment method created');
            }
            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm);
            loadMethods();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (method) => {
        setForm({
            bankName: method.bankName,
            accountName: method.accountName,
            accountNumber: method.accountNumber,
            imageLink: method.imageLink || '',
            color: method.color || '#10b981',
            isActive: method.isActive
        });
        setEditingId(method._id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        try {
            await paymentMethodAPI.delete(id);
            toast.success('Deleted successfully');
            setDeleteConfirm(null);
            loadMethods();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied!');
    };

    const toggleActive = async (method) => {
        try {
            await paymentMethodAPI.update(method._id, { isActive: !method.isActive });
            loadMethods();
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    if (loading) return <Loader message="Loading payment methods..." />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
                        </div>
                        Payment Methods
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-12">
                        Manage bank accounts and mobile wallets for fee payments
                    </p>
                </div>
                <button
                    onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20"
                >
                    <Plus className="w-4 h-4" />
                    Add New Payment Method
                </button>
            </div>

            {/* Payment Method Cards */}
            {methods.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                        <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">No payment methods yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add New Payment Method" to create one</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {methods.map((method) => (
                            <motion.div
                                key={method._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative overflow-hidden rounded-2xl border shadow-lg transition-all"
                                style={{
                                    borderColor: method.color + '40',
                                    background: `linear-gradient(135deg, ${method.color}08, ${method.color}15)`
                                }}
                            >
                                {/* Top accent bar */}
                                <div className="h-1.5 w-full" style={{ backgroundColor: method.color }} />

                                <div className="p-5">
                                    {/* Header with actions */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl" style={{ backgroundColor: method.color + '20' }}>
                                                <Building2 className="w-4 h-4" style={{ color: method.color }} />
                                            </div>
                                            <span
                                                className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                                style={{
                                                    backgroundColor: method.color + '20',
                                                    color: method.color
                                                }}
                                            >
                                                {method.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleActive(method)}
                                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                title={method.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {method.isActive ? (
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(method)}
                                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(method._id)}
                                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bank Name */}
                                    <h3 className="text-xl font-black mb-3" style={{ color: method.color }}>
                                        {method.bankName}
                                    </h3>

                                    {/* Details */}
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Name</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{method.accountName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Number</p>
                                            <div
                                                onClick={() => handleCopy(method.accountNumber)}
                                                className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 px-3 py-2.5 rounded-xl border cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-colors group"
                                                style={{ borderColor: method.color + '30' }}
                                            >
                                                <span className="font-mono font-black text-sm" style={{ color: method.color }}>
                                                    {method.accountNumber}
                                                </span>
                                                <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR/Image preview */}
                                    {method.imageLink && (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">QR Code / Logo</p>
                                            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 bg-white p-1" style={{ borderColor: method.color + '40' }}>
                                                <img
                                                    src={method.imageLink}
                                                    alt={`${method.bankName} QR`}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Confirmation */}
                                <AnimatePresence>
                                    {deleteConfirm === method._id && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl"
                                        >
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center max-w-xs">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm mb-3">Delete this payment method?</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(method._id)}
                                                        className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null); } }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                    {editingId ? 'Edit Payment Method' : 'Add New Payment Method'}
                                </h2>
                                <button
                                    onClick={() => { setShowForm(false); setEditingId(null); }}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Bank Name */}
                                <div>
                                    <label className={labelClass}>Bank Name *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.bankName}
                                            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                            placeholder="e.g. EASYPAISA, JazzCash, HBL"
                                            className={fieldClass + ' pl-10'}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Account Name */}
                                <div>
                                    <label className={labelClass}>Account Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.accountName}
                                            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                                            placeholder="e.g. Salman Yasin"
                                            className={fieldClass + ' pl-10'}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Account Number */}
                                <div>
                                    <label className={labelClass}>Account Number *</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.accountNumber}
                                            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                                            placeholder="e.g. 03092333121"
                                            className={fieldClass + ' pl-10'}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Image Link */}
                                <div>
                                    <label className={labelClass}>QR Code / Image Link</label>
                                    <div className="relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="url"
                                            value={form.imageLink}
                                            onChange={(e) => setForm({ ...form, imageLink: e.target.value })}
                                            placeholder="https://example.com/qr-code.png"
                                            className={fieldClass + ' pl-10'}
                                        />
                                    </div>
                                    {form.imageLink && (
                                        <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border bg-white p-1">
                                            <img
                                                src={form.imageLink}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className={labelClass}>Card Theme Color</label>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Palette className="w-4 h-4 text-gray-400" />
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, color })}
                                                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                                                        form.color === color
                                                            ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                                                            : 'border-transparent hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={form.color}
                                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                                            className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                        />
                                        <span className="text-sm font-mono text-gray-500">{form.color}</span>
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${
                                            form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                                            form.isActive ? 'translate-x-5' : ''
                                        }`} />
                                    </button>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                        {form.isActive ? 'Active (shown to students)' : 'Inactive (hidden from students)'}
                                    </span>
                                </div>

                                {/* Preview Card */}
                                <div className="rounded-xl border overflow-hidden" style={{ borderColor: form.color + '40' }}>
                                    <div className="h-1 w-full" style={{ backgroundColor: form.color }} />
                                    <div className="p-4 bg-white dark:bg-slate-800">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preview</p>
                                        <p className="text-lg font-black mt-1" style={{ color: form.color }}>
                                            {form.bankName || 'Bank Name'}
                                        </p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">
                                            {form.accountName || 'Account Name'}
                                        </p>
                                        <p className="font-mono text-sm font-bold mt-2" style={{ color: form.color }}>
                                            {form.accountNumber || '0000-0000-0000'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingId(null); }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            editingId ? 'Update' : 'Create'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminFeeMethods;
