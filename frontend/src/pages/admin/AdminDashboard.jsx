import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
    DollarSign,
    Users,
    GraduationCap,
    TrendingUp,
    ArrowUpRight,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    ChevronRight,
    Search,
    Filter,
    ArrowRight,
    Download,
    BookOpen,
    Trash2,
    Activity,
    UserCheck,
    Zap,
    UserPlus
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { BarChart, DoughnutChart } from '../../components/charts/Charts';
import { statsAPI, feeAPI } from '../../services/api';

import Loader, { ButtonLoader } from '../../components/ui/Loader';
import BirthdayWish from '../../components/dashboard/BirthdayWish';
import { formatDate } from '../../utils/dateFormatter';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const today = new Date();
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [filters, setFilters] = useState({
        month: '',
        startDate: getLocalDateString(startOfCurrentMonth),
        endDate: getLocalDateString(today)
    });
    const [dateRangeType, setDateRangeType] = useState('current_month');
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [slipModal, setSlipModal] = useState({ open: false, url: null, student: '' });
    const [liveCount, setLiveCount] = useState(null);
    const dashboardRef = useRef(null);

    useEffect(() => {
        // Setup real-time updates
        const getSocketURL = () => {
            const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            return rawUrl.replace('/api', '');
        };
        const socket = io(getSocketURL(), { withCredentials: true });
        
        const user = JSON.parse(localStorage.getItem('user'));
        const myId = user?.id || user?._id;
        if (myId) socket.emit('join_chat', myId);

        socket.on('new_submission', () => fetchStats());
        socket.on('new_assignment', () => fetchStats());
        socket.on('new_global_message', () => fetchStats());
        socket.on('active_users_count', (count) => {
            setLiveCount(count);
            fetchStats();
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        fetchStats();
    }, [filters.month, filters.startDate, filters.endDate]);

    useEffect(() => {
        if (dateRangeType === 'custom') return;

        const today = new Date();
        const endStr = getLocalDateString(today);
        const start = new Date(today);

        if (dateRangeType === 'current_month') {
            start.setFullYear(today.getFullYear(), today.getMonth(), 1);
        } else if (dateRangeType === '1m') {
            start.setMonth(start.getMonth() - 1);
        } else if (dateRangeType === '2m') {
            start.setMonth(start.getMonth() - 2);
        } else if (dateRangeType === '3m') {
            start.setMonth(start.getMonth() - 3);
        }

        setFilters({ month: '', startDate: getLocalDateString(start), endDate: endStr });
    }, [dateRangeType]);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.startDate && filters.endDate) {
                params.startDate = filters.startDate;
                params.endDate = filters.endDate;
            } else if (filters.month) {
                params.month = filters.month;
            }

            const res = await statsAPI.getAdminDashboard(params);
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!dashboardRef.current) return;
        setIsDownloading(true);
        try {
            // Show PDF-only header
            const pdfHeader = dashboardRef.current.querySelector('.show-in-pdf');
            if (pdfHeader) pdfHeader.style.display = 'block';

            // Use visibility: hidden for interactive elements
            const elementsToHide = dashboardRef.current.querySelectorAll('.no-pdf');
            elementsToHide.forEach(el => el.style.visibility = 'hidden');

            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            // Restore
            elementsToHide.forEach(el => el.style.visibility = 'visible');
            if (pdfHeader) pdfHeader.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Handle multi-page if needed, but for dashboard usually one page scaled is fine
            // or we just put it on one scrollable-like page in PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
            pdf.save(`LMS-Dashboard-${filters.month || 'report'}.pdf`);
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        try {
            const cleanUrl = String(url).trim();
            if (cleanUrl.toLowerCase().startsWith('http') || cleanUrl.toLowerCase().startsWith('data:')) {
                return cleanUrl;
            }
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
            return `${baseUrl}/${cleanUrl.replace(/\\/g, '/').replace(/^\//, '')}`;
        } catch (e) {
            return url;
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            // Clear other filter type if one is set
            ...(name === 'month' ? { startDate: '', endDate: '' } : {}),
            ...(name === 'startDate' || name === 'endDate' ? { month: '' } : {})
        }));
    };

    const handleDeleteSubmission = async (row) => {
        if (!window.confirm(`Are you sure you want to delete this submission for ${row.student}? This involves money and cannot be undone.`)) {
            return;
        }

        try {
            // Optimistic update (optional, but let's stick to refetch for accuracy on totals)
            // But we can show loading state if needed.
            await feeAPI.deleteInstallment(row.feeId, row.id);
            // Refetch to update list and total revenue
            fetchStats();
        } catch (error) {
            console.error('Failed to delete submission:', error);
            alert('Failed to delete submission');
        }
    };

    const columns = [
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const statusConfig = {
                    pending: { variant: 'warning', icon: Clock },
                    verified: { variant: 'success', icon: CheckCircle },
                    rejected: { variant: 'error', icon: XCircle },
                };
                const config = statusConfig[row.status] || statusConfig.pending;
                return (
                    <Badge variant={config.variant}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </Badge>
                );
            },
        },
        {
            header: 'Student',
            accessor: 'student',
            render: (row) => (
                <div className="flex items-center gap-3">
                    {row.photo ? (
                        <img src={getImageUrl(row.photo)} alt={row.student} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black italic shadow-sm">
                            {row.student.charAt(0)}
                        </div>
                    )}
                    <span className="font-bold text-gray-900 text-xs uppercase tracking-tighter">{row.student}</span>
                </div>
            ),
        },
        {
            header: 'Course',
            accessor: 'course',
            render: (row) => <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">{row.course}</span>,
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => <span className="font-black text-gray-900">Rs {row.amount.toLocaleString()}</span>,
        },
        {
            header: 'Date',
            accessor: 'date',
            render: (row) => <span className="text-[10px] font-bold text-gray-500">{formatDate(row.date)}</span>,
        },
        {
            header: 'Action',
            headerClassName: 'no-pdf',
            className: 'no-pdf',
            render: (row) => (
                <div className="flex items-center gap-2">
                    {row.receiptUrl && (
                        <button
                            onClick={() => setSlipModal({ open: true, url: row.receiptUrl, student: row.student })}
                            className="p-2.5 bg-blue-50 hover:bg-blue-500 rounded-xl transition-all group shadow-sm active:scale-90"
                            title="View Uploaded Slip"
                        >
                            <Eye className="w-5 h-5 text-blue-500 group-hover:text-white" />
                        </button>
                    )}
                    <button
                        onClick={() => handleDeleteSubmission(row)}
                        className="p-2.5 bg-red-50 hover:bg-red-500 rounded-xl transition-all group shadow-sm active:scale-90"
                        title="Delete Submission"
                    >
                        <Trash2 className="w-5 h-5 text-red-500 group-hover:text-white" />
                    </button>
                </div>
            ),
        },
    ];

    const doughnutChartData = {
        labels: ['Verified', 'Pending', 'Rejected'],
        datasets: [
            {
                data: data ? [data.feeStatus.verified, data.feeStatus.pending, data.feeStatus.rejected] : [1, 0, 0],
                backgroundColor: ['#10B981', '#ff8e01', '#EF4444'],
                borderWidth: 0,
            },
        ],
    };

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader message="Syncing Portal Data..." size="lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6" ref={dashboardRef}>
            <BirthdayWish />

            {/* Management Pulse - NEW Essential Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:border-primary/30 transition-all group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary/70 transition-colors">Live Now</p>
                        <p className="text-lg font-black text-gray-900">{(liveCount !== null ? liveCount : data?.managementPulse?.activeNow) || 0} Members Online</p>
                    </div>
                </div>
                <div 
                    onClick={() => navigate('/admin/directory?filter=pending')}
                    className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:border-primary/30 transition-all group cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary/70 transition-colors">Pending Approvals</p>
                        <p className="text-lg font-black text-gray-900">{data?.managementPulse?.pendingApprovals?.total || 0} Users Awaiting</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:border-primary/30 transition-all group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary/70 transition-colors">Server Status</p>
                        <p className="text-lg font-black text-gray-900">Optimal Performance</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:border-primary/30 transition-all group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary/70 transition-colors">Data Sync</p>
                        <p className="text-lg font-black text-gray-900">Real-time Connected</p>
                    </div>
                </div>
            </div>
            {/* PDF-only Header (Visible only during capture or if we use specific CSS) */}
            <div className="hidden show-in-pdf mb-8 border-b-2 border-primary pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">LMS Performance Report</h1>
                        <p className="text-primary font-black uppercase tracking-[0.4em] text-sm mt-2">Adeeb Technology Lab • Management Portal</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Report Generated</p>
                        <p className="text-lg font-black text-gray-900 uppercase tracking-tighter">{formatDate(new Date())}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Dashboard Analytics</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Real-time system overview</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex gap-3 sm:gap-4 no-pdf">
                    <button
                        onClick={() => navigate('/admin/directory')}
                        className="flex items-center justify-center gap-2 bg-white text-gray-700 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs border border-gray-200 shadow-sm hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                        <BookOpen className="w-4 h-4 hidden sm:block" />
                        Directory
                    </button>
                    <button
                        onClick={() => navigate('/admin/teacher-directory')}
                        className="flex items-center justify-center gap-2 bg-white text-gray-700 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs border border-gray-200 shadow-sm hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                        <Users className="w-4 h-4 hidden sm:block" />
                        Teacher Directory
                    </button>
                    <button
                        onClick={() => window.open('/verify', '_blank')}
                        className="flex items-center justify-center gap-2 bg-white text-gray-700 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs border border-gray-200 shadow-sm hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                        <CheckCircle className="w-4 h-4 hidden sm:block" />
                        Verify Certificate
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center justify-center gap-2 bg-primary text-white px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <ButtonLoader isLoading={isDownloading} icon={<Download className="w-4 h-4 hidden sm:block" />}>
                            {isDownloading ? 'Generating...' : 'Download Report'}
                        </ButtonLoader>
                    </button>
                </div>
            </div>

            {/* Header & Main Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* Revenue Section */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-primary mb-1">Financial Intelligence</h2>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Total Revenue</h3>
                                </div>
                                <div className="flex flex-col md:items-end gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border-2 border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
                                            <Calendar className="w-5 h-5 text-primary ml-2" />
                                            <select
                                                value={dateRangeType}
                                                onChange={(e) => setDateRangeType(e.target.value)}
                                                className="bg-transparent border-none text-sm font-black uppercase tracking-widest focus:ring-0 cursor-pointer px-3 outline-none"
                                            >
                                                <option value="current_month">Current Month</option>
                                                <option value="1m">1 Month</option>
                                                <option value="2m">2 Months</option>
                                                <option value="3m">3 Months</option>
                                                <option value="custom">Custom Range</option>
                                            </select>
                                        </div>
                                        {isLoading && <ButtonLoader isLoading={true} className="w-6 h-6" />}
                                    </div>

                                    {dateRangeType === 'custom' && (
                                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border-2 border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Custom Range</span>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={filters.startDate}
                                                onChange={handleFilterChange}
                                                className="bg-transparent border-none text-xs font-black focus:ring-0 cursor-pointer w-32"
                                            />
                                            <ArrowRight className="w-4 h-4 text-primary/30" />
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={filters.endDate}
                                                onChange={handleFilterChange}
                                                className="bg-transparent border-none text-xs font-black focus:ring-0 cursor-pointer w-32"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-6 mb-2">
                                <span className="text-3xl sm:text-7xl font-black text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">
                                    Rs {data?.totalRevenue.toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2 px-4 py-2 text-primary rounded-2xl">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Growth Plan Active</span>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mt-2 ml-1">
                                Verified Installments from {filters.startDate ? `${filters.startDate} to ${filters.endDate}` : `Month: ${filters.month}`}
                            </p>
                        </div>
                    </div>

                    {/* Student Stats Section */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-primary/10 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Global Database</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.total}</div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Total Students</p>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-primary/10 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Active Learning</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.registered}</div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Registered (Active)</p>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-primary/10 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Alumni Network</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.passout}</div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Passout Graduates</p>
                        </div>
                    </div>

                    {/* Weekly Off Days Settings */}


                    {/* Active Users - Online Now */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Live Network</h2>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Active Members</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-[10px] font-black text-primary uppercase">{data?.managementPulse?.activeUsers?.length || 0} Online</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {data?.managementPulse?.activeUsers?.map((user) => (
                                <div key={user._id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                                    <div className="relative shrink-0">
                                        {user.photo ? (
                                            <img src={user.photo} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-gray-200" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{user.name}</h4>
                                            <Badge variant={user.role === 'teacher' ? 'warning' : user.role === 'intern' ? 'primary' : 'info'} size="xs" className="shrink-0">
                                                {user.role}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold tracking-widest truncate">{user.email}</p>
                                    </div>
                                </div>
                            ))}
                            {!data?.managementPulse?.activeUsers?.length && (
                                <div className="col-span-full text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Active Users Detected</p>
                                    <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-1">All members are currently offline</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fee Status Graph & Recent Registrations */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Verification Helix</h2>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Fee Distribution</h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                                <Filter className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                        <div className="relative h-64 mb-8">
                            <DoughnutChart data={doughnutChartData} height={256} />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10/50">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Verified</span>
                                <span className="font-black text-primary">{data?.feeStatus.verified}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10/50">
                                <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Submissions</span>
                                <span className="font-black text-orange-800">{data?.feeStatus.pending}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100/50">
                                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Rejected</span>
                                <span className="font-black text-red-800">{data?.feeStatus.rejected}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Registrations Feed - NEW Essential Section */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Onboarding Stream</h2>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Recent Enrollments</h3>
                            </div>
                            <UserPlus className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="space-y-4">
                            {data?.managementPulse?.recentRegistrations?.map((regUser, idx) => (
                                <div key={regUser._id || idx} className="flex items-center justify-between group/user">
                                    <div className="flex items-center gap-3">
                                        {regUser.photo ? (
                                            <img src={regUser.photo} className="w-10 h-10 rounded-xl object-cover border-2 border-gray-50" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover/user:bg-primary/10 group-hover/user:text-primary transition-colors">
                                                {regUser.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{regUser.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{regUser.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-300 uppercase">{formatDate(regUser.createdAt)}</p>
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/30 ml-auto mt-1" />
                                    </div>
                                </div>
                            ))}
                            {data?.managementPulse?.recentRegistrations?.length === 0 && (
                                <p className="text-center text-gray-400 text-[10px] py-4 uppercase font-bold tracking-widest">No Recent Signups</p>
                            )}
                        </div>
                        <button 
                            onClick={() => navigate('/admin/directory')}
                            className="w-full mt-6 py-3 bg-gray-50 hover:bg-primary/5 text-[9px] font-black text-gray-500 hover:text-primary rounded-xl uppercase tracking-[0.2em] transition-all"
                        >
                            View Directory
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Fee Submissions Table */}
            <div className="space-y-4 pt-4">
                <div className="flex items-end justify-between px-2">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Financial Stream</h2>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Recent Fee Submissions</h3>
                    </div>
                    <button
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="flex items-center gap-3 group cursor-pointer bg-white px-6 py-3 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-primary transition-all active:scale-95 no-pdf"
                    >
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-primary transition-colors">
                            {showFullHistory ? 'Collapse History' : 'Execute View All'}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:rotate-45 transition-all duration-500">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <DataTable
                            columns={columns}
                            data={showFullHistory ? (data?.recentSubmissions || []) : (data?.recentSubmissions.slice(0, 5) || [])}
                        />
                    </div>
                    {data?.recentSubmissions.length === 0 && (
                        <div className="p-20 text-center">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Recent Activity Detected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Slip Image Modal */}
            <Modal isOpen={slipModal.open} onClose={() => setSlipModal({ open: false, url: null, student: '' })} title={`Payment Slip — ${slipModal.student}`}>
                <div className="space-y-4">
                    {slipModal.url ? (
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                            <img
                                src={getImageUrl(slipModal.url)}
                                alt="Payment Slip"
                                className="w-full h-auto"
                            />
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No slip image available.</p>
                    )}
                    <div className="flex justify-end">
                        <button onClick={() => setSlipModal({ open: false, url: null, student: '' })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Close</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDashboard;





