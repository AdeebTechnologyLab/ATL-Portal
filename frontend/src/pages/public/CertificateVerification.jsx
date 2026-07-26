import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Award, Calendar, CheckCircle, AlertCircle, ArrowRight, ExternalLink, BookOpen, MapPin, Phone, Mail, Globe, Clock, MessageCircle } from 'lucide-react';
import { certificateAPI } from '../../services/api';
import { ButtonLoader } from '../../components/ui/Loader';

const CertificateVerification = () => {
    const [rollNo, setRollNo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [certificates, setCertificates] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        let query = rollNo.trim();
        if (!query) return;

        // Normalize roll number: ATL-0001 or 0001 -> 0001
        // We strip ATL- prefix if present to match the DB format
        if (query.toUpperCase().startsWith('ATL-')) {
            query = query.substring(4);
        }

        setIsLoading(true);
        setError(null);
        setCertificates(null);

        try {
            const response = await certificateAPI.verify(query);
            setCertificates(response.data.certificates);
        } catch (err) {
            setError(err.response?.data?.message || 'No certificates found for this roll number');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-950">
            {/* Header / Hero Section */}
            <div className="bg-[#1a1c23] text-white pt-16 pb-28 px-4 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden z-0">
                    <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
                    <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]"></div>
                </div>

                <div className="max-w-3xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full mb-6 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Trusted Verification Portal</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-black mb-5 tracking-tight leading-[1.1]">
                            Certificate <span className="text-primary">Verification</span>
                        </h1>
                        <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
                            Verify the authenticity of certificates issued by <span className="text-white font-semibold">Adeeb Technology Lab</span>. Enter the student's Roll Number below.
                        </p>
                    </motion.div>

                    {/* Search Box */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="max-w-lg mx-auto mt-10"
                    >
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
                                <Search className="absolute left-5 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={rollNo}
                                    onChange={(e) => setRollNo(e.target.value)}
                                    placeholder="Enter Roll Number (e.g., 0273)"
                                    className="flex-1 px-14 py-5 text-base bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !rollNo.trim()}
                                    className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-[#e67e01] text-white px-7 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    <ButtonLoader isLoading={isLoading}>
                                        Verify <ArrowRight className="w-4 h-4" />
                                    </ButtonLoader>
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>

            {/* Results Section — hidden until a roll number search completes */}
            {(error || certificates) && (
            <div className="flex-1 px-4 py-16 -mt-12 relative z-20">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-lg border border-red-100 dark:border-red-900/30 text-center max-w-md mx-auto"
                            >
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <AlertCircle className="w-10 h-10 text-red-400" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Record Found</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{error}</p>
                            </motion.div>
                        )}

                        {certificates && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold border border-emerald-100">
                                        <CheckCircle className="w-4 h-4" />
                                        {certificates.length} Verified Certificate{certificates.length > 1 ? 's' : ''} Found
                                    </div>
                                </div>

                                {certificates.map((cert, index) => (
                                    <React.Fragment key={index}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden relative group hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary to-primary/60"></div>

                                        <div className="p-8">
                                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                                                {/* User Photo + Roll No */}
                                                <div className="flex-shrink-0 flex flex-col items-center">
                                                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-primary/10 shadow-lg bg-gray-100 dark:bg-gray-800">
                                                        <img
                                                            src={cert.photo || `https://ui-avatars.com/api/?name=${cert.name}&background=FF6B00&color=fff`}
                                                            alt={cert.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">{cert.rollNo}</span>
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
                                                        <div>
                                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{cert.name}</h2>
                                                            <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{cert.position || 'Student'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Verified</span>
                                                        </div>
                                                    </div>

                                                {/* For teacher certs with multiple courses: show as a list */}
                                                {cert.selectedCourses && cert.selectedCourses.length > 0 && cert.position !== 'Teacher' ? (
                                                    <div className="space-y-4">
                                                        <div className="bg-primary/5/50 p-5 rounded-3xl border border-primary/10">
                                                            <p className="text-[11px] text-primary mb-3 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4" /> Courses Taught
                                                            </p>
                                                            <div className="flex flex-wrap gap-2.5">
                                                                {cert.selectedCourses.map((course, ci) => (
                                                                    <span key={ci} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 flex items-center gap-2">
                                                                        <CheckCircle className="w-4 h-4 text-white/80" />
                                                                        {course}
                                                                    </span>
                                                                ))}
                                                                {cert.hasMoreCourses && (
                                                                    <span className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-black tracking-widest">
                                                                        ……
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                            {cert.location && (
                                                                <div>
                                                                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider font-semibold">Campus</p>
                                                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                                                                        <MapPin className="w-4 h-4 text-primary" />
                                                                        {cert.location}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider font-semibold">Duration</p>
                                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                                                                    <Calendar className="w-4 h-4 text-primary" />
                                                                    {cert.duration || '—'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider font-semibold">Issued On</p>
                                                                <p className="font-medium text-gray-700 dark:text-gray-300">
                                                                    {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                    </div>
                                                ) : (
                                                    /* Standard single-course display (student/intern) */
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/60">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Course / Program</p>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {cert.position === 'Teacher' && cert.hasMoreCourses ? (
                                                                    <div className="relative inline-flex">
                                                                        <p
                                                                            className="font-black text-gray-900 dark:text-white text-lg cursor-help hover:text-primary transition-colors"
                                                                            title={(cert.hiddenCourses || []).join(', ')}
                                                                        >
                                                                            {cert.course || '—'}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="font-black text-gray-900 dark:text-white text-lg">{cert.course || '—'}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {cert.location && (
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Campus</p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                    </div>
                                                                    <span className="font-bold text-gray-900 dark:text-white">{cert.location}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Duration</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                                                </div>
                                                                <span className="font-bold text-gray-900 dark:text-white">{cert.duration || '—'}</span>
                                                            </div>
                                                        </div>
                                                        {cert.issuedAt && (
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Issued On</p>
                                                                <p className="font-bold text-gray-900 dark:text-white">
                                                                    {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        )}


                                                    </div>
                                                )}

                                                {/* Status Timeline */}
                                                <div className="mt-6 mb-2">
                                                    <div className="flex items-center justify-between relative">
                                                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                        <div className="absolute top-3 left-0 h-0.5 bg-gradient-to-r from-red-500 via-emerald-500 to-primary transition-all duration-700" style={{ width: cert.statusLevel === 3 ? '100%' : cert.statusLevel === 2 ? '50%' : '0%' }}></div>

                                                        <div className="flex flex-col items-center relative z-10">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cert.statusLevel === 1 ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                                {cert.statusLevel === 1 ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <span className="w-2 h-2 rounded-full bg-white"></span>}
                                                            </div>
                                                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide ${cert.statusLevel === 1 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>Rejected</span>
                                                        </div>

                                                        <div className="flex flex-col items-center relative z-10">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cert.statusLevel === 2 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                                {cert.statusLevel === 2 ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <span className="w-2 h-2 rounded-full bg-white"></span>}
                                                            </div>
                                                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide ${cert.statusLevel === 2 ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>Joining</span>
                                                        </div>

                                                        <div className="flex flex-col items-center relative z-10">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cert.statusLevel === 3 ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                                {cert.statusLevel === 3 ? <Award className="w-3.5 h-3.5 text-white" /> : <span className="w-2 h-2 rounded-full bg-white"></span>}
                                                            </div>
                                                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide ${cert.statusLevel === 3 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>Completed</span>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                        </div>
                                    </motion.div>

                                    </React.Fragment>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            )}

            {/* Complete Footer */}
            <footer className="bg-[#1a1c23] text-white">
                <div className="max-w-6xl mx-auto px-4 py-10">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                        <img src="/logo.png" alt="Adeeb Tech" className="h-10" />
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Adeeb Technology Lab</h3>
                            <p className="text-[11px] font-medium"><span className="text-primary">Digital Tech Expert</span> <span className="text-gray-500">· Bahawalpur & Islamabad</span></p>
                        </div>
                    </div>

                    {/* Contact + Common - 3 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-6 border-b border-white/10">
                        <div>
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3">Bahawalpur</h4>
                            <div className="gap-1.5 text-sm text-gray-400">
                                <p>📞 062 30 97 240</p>
                                <p>💬 <a href="https://wa.me/923393900444" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">03 3939 00 444</a></p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3">Islamabad</h4>
                            <div className="gap-1.5 text-sm text-gray-400">
                                <p>📞 051 613 2233</p>
                                <p>💬 <a href="https://wa.me/923092333121" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">030 92 333 121</a></p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3">Reach Us</h4>
                            <div className="gap-1.5 text-sm text-gray-400">
                                <p>📧 <a href="mailto:info.AdeebTechLab@gmail.com" className="hover:text-primary transition-colors">info.AdeebTechLab@gmail.com</a></p>
                                <p>🌐 <a href="https://www.AdeebTechLab.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">www.AdeebTechLab.com</a></p>
                            </div>
                        </div>
                    </div>

                    {/* Social Media - 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-6 border-b border-white/10">
                        <div>
                            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Adeeb Technology Lab (Company)</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                <a href="https://adeeb-technology-lab-website.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Website</a>
                                <a href="mailto:info.AdeebTechLab@gmail.com" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Email</a>
                                <a href="https://www.whatsapp.com/channel/0029VaCeeBg4inos1Eqtbc43" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">WhatsApp</a>
                                <a href="https://web.facebook.com/AdeebTechnologyLab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Facebook</a>
                                <a href="https://www.instagram.com/adeebtechlab/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Instagram</a>
                                <a href="https://www.linkedin.com/company/AdeebTechnologyLab/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">LinkedIn</a>
                                <a href="https://x.com/AdeebTechLab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">X</a>
                                <a href="https://www.youtube.com/AdeebTechnologyLab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">YouTube</a>
                                <a href="https://www.tiktok.com/@adeebtechnologylab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">TikTok</a>
                                <a href="https://www.threads.com/@adeebtechlab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Threads</a>
                                <a href="https://github.com/AdeebTechLab" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">GitHub</a>
                                <a href="https://www.snapchat.com/@salmanadeeb02" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Snapchat</a>
                                <a href="https://www.pinterest.com/adeebtechnologylab/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Pinterest</a>
                                <a href="https://play.google.com/store/apps/details?id=com.adeebtechlab.apps" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Mobile App</a>
                                <a href="https://apps.microsoft.com/search/publisher?name=Adeeb+Technology+Lab&hl=en-GB&gl=US" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Software</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">The Computer Courses (Academy)</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                <a href="https://the-computer-courses-web.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Website</a>
                                <a href="mailto:info.TheComputerCourse@gmail.com" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Email</a>
                                <a href="https://www.whatsapp.com/channel/0029VaC5PtjEgGfEQtQZUh1p" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">WhatsApp</a>
                                <a href="https://www.facebook.com/TheComputerCourses" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Facebook</a>
                                <a href="https://www.instagram.com/thecomputercourses" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">Instagram</a>
                                <a href="https://www.linkedin.com/company/thecomputercourses" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">LinkedIn</a>
                                <a href="https://wa.me/923393900444" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-2.5 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:text-primary hover:bg-primary/10 transition-all border border-white/5 font-medium">WhatsApp Direct</a>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <p className="text-[11px] text-gray-600 text-center font-medium">
                        © {new Date().getFullYear()} Adeeb Technology Lab. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};



export default CertificateVerification;



