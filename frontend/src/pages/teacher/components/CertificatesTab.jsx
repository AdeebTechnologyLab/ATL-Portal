import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, User, CheckCircle, Clock as ClockIcon, FileText, Send } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { certificateAPI } from '../../../services/api';
import Loader, { ButtonLoader } from '../../../components/ui/Loader';

const CertificatesTab = ({ course, students }) => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        skills: '',
        duration: '',
        notes: ''
    });

    useEffect(() => {
        setFormData({
            skills: course.title || course.name || '',
            duration: course.duration || '',
            notes: ''
        });
    }, [course]);

    // Simple status check - in a real app, we'd fetch this from the backend
    // For now, let's assume we fetch requests for this course
    useEffect(() => {
        // Since we don't have a specific GET /requests for teachers per course yet, 
        // we'll just show the buttons. In a full implementation, we'd fetch the status.
        setIsLoading(false);
    }, [course._id]);

    const handleRequestClick = (student) => {
        setSelectedStudent(student);
        setIsRequestModalOpen(true);
    };

    const handleSubmitRequest = async () => {
        if (!selectedStudent || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await certificateAPI.request({
                userId: selectedStudent.id || selectedStudent._id,
                courseId: course._id,
                ...formData
            });
            alert('Certificate request submitted successfully!');
            setIsRequestModalOpen(false);
            // Optionally refresh or show pending status
        } catch (error) {
            console.error('Error requesting certificate:', error);
            alert(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <Loader message="Loading requests..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Certificate Issuance</h2>
                    <p className="text-sm text-gray-500">Recommend students for certificates upon course completion</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {students.map((student, index) => (
                    <motion.div
                        key={student.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between hover:border-primary transition-all hover:bg-white"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">Roll No: {student.rollNo}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleRequestClick(student)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/10"
                            >
                                <Award className="w-4 h-4" />
                                Request Certificate
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Request Modal */}
            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Certificate Recommendation"
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-primary/10">
                            {selectedStudent?.photo ? (
                                <img src={selectedStudent.photo} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-primary">{selectedStudent?.name}</p>
                            <p className="text-xs text-primary">Recommending for certificate</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Position/Skills (e.g. Photoshop CC)</label>
                        <input
                            type="text"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Enter specialized skills"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Duration (e.g. Sep 2019)</label>
                        <input
                            type="text"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Course duration"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Additional Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                            placeholder="Reason for recommendation..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsRequestModalOpen(false)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitRequest}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <ButtonLoader /> : <Send className="w-5 h-5" />}
                            Send Request
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CertificatesTab;



