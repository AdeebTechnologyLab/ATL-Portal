import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, ExternalLink, BookOpen, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { certificateAPI } from '../../services/api';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { formatDate } from '../../utils/dateFormatter';

const TeacherCertificates = () => {
    const { user } = useSelector((state) => state.auth);
    const [certificate, setCertificate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCertificate();
    }, []);

    const fetchCertificate = async () => {
        setIsLoading(true);
        try {
            const res = await certificateAPI.getMy();
            const certs = res.data.certificates || [];
            // Teacher certificate = one with no course (course is null)
            const teacherCert = certs.find(c => !c.course || c.course === null);
            setCertificate(teacherCert || null);
        } catch (e) {
            console.error('Failed to fetch certificate:', e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Loader message="Loading certificates..." />
        );
    }

    if (!certificate) {
        return (
            <div className="max-w-2xl mx-auto mt-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-16 border-2 border-dashed border-gray-200 shadow-sm"
                >
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Award className="w-10 h-10 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Certificate Yet</h2>
                    <p className="text-gray-400 text-base">
                        Your certificate will appear here once the admin issues it to you.
                    </p>
                </motion.div>
            </div>
        );
    }

    const selectedCourses = certificate.selectedCourses || [];
    const issueDate = certificate.issuedAt
        ? formatDate(certificate.issuedAt)
        : '—';

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-primary rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                    <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">My Certificate</h1>
                    <p className="text-sm text-gray-400">Issued by Adeeb Technology Lab</p>
                </div>
            </motion.div>

            {/* Certificate Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
            >
                {/* Top Gold Banner */}
                <div className="bg-gradient-to-r from-amber-500 via-primary to-amber-400 px-8 py-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Teacher Photo or Initial */}
                        <div className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-lg overflow-hidden bg-white/10 flex items-center justify-center">
                            {user?.photo ? (
                                <img src={user.photo.startsWith('http') ? user.photo : `http://localhost:5000${user.photo}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-white">{user?.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 mb-0.5">Certificate Holder</p>
                            <h2 className="text-xl font-black tracking-tight">{user?.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-white/20 rounded-lg px-2 py-0.5 font-mono">
                                    {certificate.rollNo}
                                </span>
                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Teacher</span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
                            <Award className="w-7 h-7 text-white" />
                        </div>
                        <p className="text-[9px] text-white/50 mt-1 uppercase tracking-widest">Verified</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Courses Section */}
                    {selectedCourses.length > 0 && (
                        <div className="bg-primary/5/50 p-5 rounded-3xl border border-primary/10">
                            <p className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                                <BookOpen className="w-4 h-4" /> Courses Taught
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                {selectedCourses.map((course, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20"
                                    >
                                        <CheckCircle className="w-4 h-4 text-white/80" />
                                        {course}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {certificate.skills && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-primary" /> Skills
                                </p>
                                <p className="font-semibold text-gray-800 text-sm">{certificate.skills}</p>
                            </div>
                        )}
                        {certificate.duration && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-blue-500" /> Duration
                                </p>
                                <p className="font-semibold text-gray-800 text-sm">{certificate.duration}</p>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-primary" /> Issued On
                            </p>
                            <p className="font-semibold text-gray-800 text-sm">{issueDate}</p>
                        </div>
                    </div>

                    {/* Open Certificate Button */}
                    {certificate.certificateLink && (
                        <div className="pt-2">
                            <a
                                href={certificate.certificateLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-200 active:scale-95"
                            >
                                <ExternalLink className="w-5 h-5" />
                                Open Certificate
                            </a>
                        </div>
                    )}

                    {/* Footer Seal */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>Adeeb Technology Lab — Official Certificate</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="font-semibold text-primary">Verified</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherCertificates;



