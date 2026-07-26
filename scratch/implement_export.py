import re

filepath = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\StudentsManagement.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { userAPI, settingsAPI, enrollmentAPI, assignmentAPI, feeAPI } from '../../services/api';",
    "import { userAPI, settingsAPI, enrollmentAPI, assignmentAPI, feeAPI, courseAPI } from '../../services/api';"
)

# 2. States
state_find = "    const [showExportOptions, setShowExportOptions] = useState(false);\n    const [exportType, setExportType] = useState('full'); // full | phone | email"
state_replace = """    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportConfig, setExportConfig] = useState({ format: 'full', status: 'all', courseId: 'all' });
    const [coursesList, setCoursesList] = useState([]);"""
content = content.replace(state_find, state_replace)

# 3. useEffect
ue_find = """    useEffect(() => {
        fetchStudents();
        fetchSettings();
    }, []);"""
ue_replace = """    useEffect(() => {
        fetchStudents();
        fetchSettings();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await courseAPI.getAll();
            setCoursesList(res.data.data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };"""
content = content.replace(ue_find, ue_replace)

# 4. downloadPDF signature
dp_find = "    const downloadPDF = async (type = 'full') => {"
dp_replace = """    const handleGenerateExport = () => {
        setIsExportModalOpen(false);
        downloadPDF(exportConfig);
    };

    const downloadPDF = async ({ format = 'full', status = 'all', courseId = 'all' }) => {
        const type = format;"""
content = content.replace(dp_find, dp_replace)

# 5. Filter application in downloadPDF
# Instead of replacing `filteredStudents` globally, we apply filters inside `downloadPDF` locally
# Find the start of downloadPDF's body and filter `filteredStudents` inside it.
# `downloadPDF` uses `filteredStudents` starting from `doc.text(`Total Records: ${filteredStudents.length}`, 14, 37);`

filter_insert_after = "const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for wide tables"

filter_code = """
        // Apply export-specific filters on top of the UI search filters
        let finalExportStudents = filteredStudents;
        
        if (status === 'active') {
            finalExportStudents = finalExportStudents.filter(s => getStudentStatus(s) === 'Enrolled (Active)');
        } else if (status === 'certified') {
            finalExportStudents = finalExportStudents.filter(s => getStudentStatus(s) === 'Completed');
        }

        if (courseId !== 'all') {
            const selectedCourse = coursesList.find(c => c._id === courseId);
            if (selectedCourse) {
                finalExportStudents = finalExportStudents.filter(s => 
                    userCoursesMap[s._id] && userCoursesMap[s._id].includes(selectedCourse.title)
                );
            }
        }
"""
content = content.replace(filter_insert_after, filter_insert_after + "\n" + filter_code)

# Replace all occurrences of `filteredStudents` with `finalExportStudents` INSIDE downloadPDF
# It's safer to do this replacement carefully. I will replace it after the title declaration.
# The body of downloadPDF ends around line 450.
# A simpler way is to replace `filteredStudents` in the report generation part
content = re.sub(r'filteredStudents\.map', r'finalExportStudents.map', content)
content = re.sub(r'filteredStudents\.length', r'finalExportStudents.length', content)

# 6. Export Button & Dropdown removal
export_btn_find = """                        <div className="relative flex-1 md:flex-none">
                            <button
                                onClick={() => setShowExportOptions(!showExportOptions)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>

                            {showExportOptions && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)}></div>
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                                        </div>
                                        <button
                                            onClick={() => downloadPDF('full')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Complete Report
                                        </button>
                                        <button
                                            onClick={() => downloadPDF('phone')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Phone Directory
                                        </button>
                                        <button
                                            onClick={() => downloadPDF('email')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Email List
                                        </button>
                                        <button
                                            onClick={() => downloadPDF('guardian')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <Users className="w-4 h-4" />
                                            Guardian Info
                                        </button>
                                        <button
                                            onClick={() => downloadPDF('academic')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <GraduationCap className="w-4 h-4" />
                                            Academic Info
                                        </button>
                                        <button
                                            onClick={() => downloadPDF('address')}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                                        >
                                            <MapPin className="w-4 h-4" />
                                            Address List
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>"""
export_btn_replace = """                        <div className="relative flex-1 md:flex-none">
                            <button
                                onClick={() => setIsExportModalOpen(true)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>"""
content = content.replace(export_btn_find, export_btn_replace)

# 7. Add Export Modal at the bottom
modal_code = """
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Generate Report"
                size="md"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Report Format</label>
                        <select
                            value={exportConfig.format}
                            onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="full">Complete Report</option>
                            <option value="phone">Phone Directory</option>
                            <option value="email">Email List</option>
                            <option value="guardian">Guardian Info</option>
                            <option value="academic">Academic Info</option>
                            <option value="address">Address List</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Student Status</label>
                        <select
                            value={exportConfig.status}
                            onChange={(e) => setExportConfig({ ...exportConfig, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="all">All Students</option>
                            <option value="active">Active Students</option>
                            <option value="certified">Certified / Completed</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Course</label>
                        <select
                            value={exportConfig.courseId}
                            onChange={(e) => setExportConfig({ ...exportConfig, courseId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="all">All Courses</option>
                            {coursesList.map(course => (
                                <option key={course._id} value={course._id}>{course.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsExportModalOpen(false)}
                            className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerateExport}
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};"""

content = re.sub(r'        </div>\s*<div className="text-center text-xs text-gray-500 mt-6">\s*Adeeb Technology Lab - Students Management System\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*\);\s*};\s*export default StudentsManagement;', r'        </div>\n<div className="text-center text-xs text-gray-500 mt-6">\nAdeeb Technology Lab - Students Management System\n</div>\n</div>\n</div>\n</div>\n</div>' + modal_code + '\n\nexport default StudentsManagement;', content)

# Wait, the structure at the bottom of the component is:
#         </div>
#         <div className="text-center text-xs text-gray-500 mt-6">
#             Adeeb Technology Lab - Students Management System
#         </div>
#     </div>
# </div>

# A simpler way to add the modal is to inject it right before the last closing `</div>` of the main container, or just before `<div className="text-center`.

# Let's do a more robust regex for the bottom of the file:
end_pattern = r"(<div className=\"text-center text-xs text-gray-500 mt-6\">)"
modal_injection = """
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Generate Report"
                size="md"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Report Format</label>
                        <select
                            value={exportConfig.format}
                            onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="full">Complete Report</option>
                            <option value="phone">Phone Directory</option>
                            <option value="email">Email List</option>
                            <option value="guardian">Guardian Info</option>
                            <option value="academic">Academic Info</option>
                            <option value="address">Address List</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Student Status</label>
                        <select
                            value={exportConfig.status}
                            onChange={(e) => setExportConfig({ ...exportConfig, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="all">All Students</option>
                            <option value="active">Active Students</option>
                            <option value="certified">Certified / Completed</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Course</label>
                        <select
                            value={exportConfig.courseId}
                            onChange={(e) => setExportConfig({ ...exportConfig, courseId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="all">All Courses</option>
                            {coursesList.map(course => (
                                <option key={course._id} value={course._id}>{course.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsExportModalOpen(false)}
                            className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerateExport}
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </Modal>
"""
content = re.sub(end_pattern, modal_injection + r'\n\1', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Implemented advanced export modal in StudentsManagement.jsx")
