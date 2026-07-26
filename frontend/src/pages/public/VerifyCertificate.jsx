import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, XCircle, Award, CheckCircle, ShieldCheck, Download, FileText, BookOpen, Calendar, MapPin, Briefcase, GraduationCap, ExternalLink, Phone, Mail, Globe, Clock, MessageCircle } from 'lucide-react';
import { ButtonLoader } from '../../components/ui/Loader';
import { certificateAPI } from '../../services/api';

const VerifyCertificate = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Group certificates by rollNo AND position (role)
    const groupedCertificates = certificates.reduce((acc, cert) => {
        const key = `${cert.rollNo}-${cert.position}`;
        if (!acc[key]) {
            acc[key] = {
                rollNo: cert.rollNo,
                name: cert.name,
                photo: cert.photo,
                position: cert.position,
                location: cert.location,
                courses: []
            };
        }
        acc[key].courses.push({
            course: cert.course,
            skills: cert.skills,
            duration: cert.duration,
            passoutDate: cert.passoutDate,
            certificateLink: cert.certificateLink,
            issuedAt: cert.issuedAt
        });
        return acc;
    }, {});

    const certificateGroups = Object.values(groupedCertificates);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setCertificates([]);

        try {
            const response = await certificateAPI.verify(searchQuery.trim());
            if (response.data.success) {
                setCertificates(response.data.certificates);
            }
        } catch (error) {
            console.error('Error verifying certificate:', error);
            setCertificates([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
            {/* Header section with brand colors */}
            <div className="gradient-primary text-white py-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-light rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 mb-4"
                    >
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center overflow-hidden">
                            <img
                                src="/logo.png"
                                alt="Adeeb Technology Lab Logo"
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <GraduationCap className="w-12 h-12 text-white hidden" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-white text-3xl font-black tracking-tighter leading-none">Adeeb Technology Lab</h2>
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mt-2">Empowering Your Tech Journey</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-primary text-sm font-bold uppercase tracking-widest mb-4"
                    >
                        <Award className="w-4 h-4" />
                        Official Verification Portal
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black tracking-tight leading-tight"
                    >
                        Verify Your Achievement
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-primary/10/80 text-lg max-w-2xl mx-auto font-medium"
                    >
                        The Computer Courses Bahawalpur & Islamabad. Validated security for student credentials powered by Adeeb Technology Lab.
                    </motion.p>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-[1400px] mx-auto px-4 -mt-10 mb-20 relative z-20">
                {/* Search Box Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-primary/10 border border-primary/5 max-w-4xl mx-auto"
                >
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Student Roll Number</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-0 bg-primary/5 rounded-2xl group-focus-within:bg-primary/10 transition-colors pointer-events-none" />
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary/50 group-focus-within:text-primary transition-colors pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Enter Registration ID (e.g., 0042)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-14 pr-6 py-4 bg-transparent rounded-2xl border-2 border-primary/10 focus:border-primary outline-none transition-all text-xl font-bold placeholder:font-normal placeholder:text-slate-300 text-slate-800 relative z-10"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="px-8 py-4 bg-primary hover:bg-primary text-white font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50"
                                >
                                    <ButtonLoader
                                        isLoading={isSearching}
                                        icon={<Search className="w-6 h-6" />}
                                    >
                                        VERIFY NOW
                                    </ButtonLoader>
                                </button>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        {!hasSearched && (
                            <div className="flex flex-wrap gap-4 pt-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    INSTANT VALIDATION
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    DIGITAL SIGNATURES
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    SECURD PREVIEW
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Results Section */}
                <div className="mt-12 space-y-12">
                    {hasSearched && certificates.length > 0 ? (
                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    {certificateGroups[0]?.position === 'Teacher' ? 'TEACHER RECORDS VALIDATED' : 'STUDENT RECORDS VALIDATED'}
                                </h2>
                                <div className="px-4 py-2 bg-primary/5 rounded-full border border-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                                    {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'} Found
                                </div>
                            </div>

                            <div className="grid gap-12">
                                {certificateGroups.map((group, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.15 }}
                                        className="group relative"
                                    >
                                        {/* Background Decoration for each card */}
                                        <div className="absolute -inset-4 bg-gradient-to-b from-primary/5/50 to-transparent rounded-[3rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500">
                                            <div className="flex flex-col lg:flex-row">
                                                {/* Left Panel: Student Profile */}
                                                <div className="lg:w-80 bg-slate-50/50 p-8 flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-slate-100">
                                                    <div className="relative group/photo mb-6">
                                                        <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-primary rounded-3xl opacity-20 blur-lg group-hover/photo:opacity-40 transition-opacity" />
                                                        <div className="w-40 h-52 rounded-2xl bg-white border-4 border-white shadow-2xl overflow-hidden relative z-10 transform hover:scale-[1.02] transition-transform duration-500">
                                                            {group.photo ? (
                                                                <img
                                                                    src={group.photo.startsWith('http') ? group.photo : `http://localhost:5000${group.photo}`}
                                                                    alt={group.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className={`w-full h-full flex items-center justify-center bg-slate-50 ${group.photo ? 'hidden' : ''}`}>
                                                                <User className="w-16 h-16 text-slate-200" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center z-20 border border-slate-50">
                                                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                                                                <CheckCircle className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1 mb-6">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Verified Identity</p>
                                                        <h3 className="text-2xl font-black text-slate-900 leading-tight">{group.name}</h3>
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-lg shadow-sm">
                                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                            <p className="text-xs font-bold text-primary uppercase tracking-tighter">
                                                                {group.position || 'Student'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="w-full pt-6 border-t border-slate-200/60 text-left space-y-4">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Registration</label>
                                                            <p className="text-lg font-black text-slate-800 font-mono tracking-tighter">{group.rollNo}</p>
                                                        </div>

                                                    </div>
                                                </div>

                                                {/* Right Panel: Achievement Details */}
                                                <div className="flex-1 p-8 md:p-12 flex flex-col">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-8">
                                                            <div className="h-[2px] w-12 bg-primary" />
                                                            <span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Course Credentials</span>
                                                        </div>

                                                        {/* Loop through courses */}
                                                        <div className="space-y-10">
                                                            {group.courses.map((courseData, courseIndex) => (
                                                                <div key={courseIndex} className="pb-8 border-b border-slate-100 last:border-b-0 last:pb-0">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                                <BookOpen className="w-3.5 h-3.5 text-primary" /> Training Program
                                                                            </p>
                                                                            <p className="text-2xl font-black text-slate-900 leading-tight">{courseData.course}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                                <Calendar className="w-3.5 h-3.5 text-primary" /> Completion Date
                                                                            </p>
                                                                            <p className="text-2xl font-black text-primary">{courseData.passoutDate || 'Validated'}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                                <MapPin className="w-3.5 h-3.5 text-primary" /> Certified At
                                                                            </p>
                                                                            <p className="text-lg font-bold text-slate-700">{courseData.location || group.location || 'Adeeb Technology Lab'}</p>
                                                                        </div>
                                                                        <div className="md:col-span-2 space-y-4">
                                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mastery &amp; Specialization</p>
                                                                            <div className="flex flex-wrap gap-2.5">
                                                                                {(courseData.skills || '').split(',').filter(s => s.trim()).map((skill, i) => (
                                                                                    <span key={i} className="px-4 py-2 bg-primary/5/50 text-primary rounded-xl text-sm font-bold border border-primary/10 flex items-center gap-2 hover:bg-primary/10 transition-colors">
                                                                                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                                                                                        {skill.trim()}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        {courseData.certificateLink && (
                                                                            <div className="md:col-span-2">
                                                                                <a
                                                                                    href={courseData.certificateLink}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                                                                                >
                                                                                    <ExternalLink className="w-4 h-4" />
                                                                                    Open Certificate
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>


                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ) : hasSearched && !isSearching ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[3rem] p-16 text-center border-2 border-dashed border-primary/10 max-w-2xl mx-auto shadow-2xl shadow-primary/5"
                        >
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-2">No Record Found</h2>
                            <p className="text-slate-500 text-lg mb-8 leading-relaxed font-medium">
                                We couldn't find any certificates associated with roll number <span className="text-slate-900 font-bold">"{searchQuery}"</span>. Please verify the ID and try again.
                            </p>
                            <button
                                onClick={() => { setSearchQuery(''); setHasSearched(false); }}
                                className="px-12 py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                            >
                                TRY ANOTHER SEARCH
                            </button>
                        </motion.div>
                    ) : !isSearching && (
                        <div className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                                <Award className="w-16 h-16 text-slate-400" />
                                <div className="text-xs font-black text-slate-400 uppercase tracking-[0.5em]">
                                    Awaiting Roll Number Input
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <footer className="mt-24 bg-[#1a1c23] text-white rounded-t-[3rem] px-4 pt-10 pb-8">
                    <div className="max-w-6xl mx-auto">
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
                            © {new Date().getFullYear()} The Computer Courses · All Rights Reserved
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default VerifyCertificate;
