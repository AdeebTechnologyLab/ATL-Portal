import re

filepath = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\InternsManagement.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'courseAPI' not in content:
    content = content.replace(
        "import { userAPI, settingsAPI, enrollmentAPI, assignmentAPI, feeAPI } from '../../services/api';",
        "import { userAPI, settingsAPI, enrollmentAPI, assignmentAPI, feeAPI, courseAPI } from '../../services/api';"
    )

# 2. States
state_find = r"const \[showExportOptions, setShowExportOptions\] = useState\(false\);\s*const \[exportType, setExportType\] = useState\('full'\);"
state_replace = """const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportConfig, setExportConfig] = useState({ format: 'full', status: 'all', courseId: 'all', campus: 'all' });
    const [coursesList, setCoursesList] = useState([]);"""
content = re.sub(state_find, state_replace, content)

# 3. useEffect
ue_find = """    useEffect(() => {
        fetchInterns();
        fetchSettings();
    }, []);"""
ue_replace = """    useEffect(() => {
        fetchInterns();
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

# 4. downloadPDF signature and setup
dp_find = "const downloadPDF = async (type = 'full') => {"
dp_replace = """const handleGenerateExport = () => {
        setIsExportModalOpen(false);
        downloadPDF(exportConfig);
    };

    const downloadPDF = async ({ format = 'full', status = 'all', courseId = 'all', campus = 'all' }) => {
        const type = format;"""
content = content.replace(dp_find, dp_replace)

# 5. Insert filter logic in downloadPDF
filter_insert_after = "const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for wide tables"
filter_code = """
        // Start with all interns, ignoring UI search and filters
        let finalExportInterns = interns;

        if (status === 'active') {
            finalExportInterns = finalExportInterns.filter(i => getInternStatus(i) === 'Enrolled (Active)');
        } else if (status === 'certified') {
            finalExportInterns = finalExportInterns.filter(i => getInternStatus(i) === 'Completed');
        }

        if (courseId !== 'all') {
            const selectedCourse = coursesList.find(c => c._id === courseId);
            if (selectedCourse) {
                finalExportInterns = finalExportInterns.filter(i => 
                    userCoursesMap[i._id] && userCoursesMap[i._id].includes(selectedCourse.title)
                );
            }
        }

        if (campus !== 'all') {
            finalExportInterns = finalExportInterns.filter(i => i.location?.toLowerCase() === campus.toLowerCase());
        }
"""
content = content.replace(filter_insert_after, filter_insert_after + "\n" + filter_code)

# Ensure filteredInterns is replaced with finalExportInterns only inside downloadPDF mapping logic
# Similar to what we did manually:
content = re.sub(r'filteredInterns\.map', r'finalExportInterns.map', content)
content = re.sub(r'filteredInterns\.length', r'finalExportInterns.length', content)
# Fix the UI block length issue immediately to avoid blank screen
content = content.replace("Showing {finalExportInterns.length} Interns", "Showing {filteredInterns.length} Interns")
content = content.replace("{finalExportInterns.length === 0 ?", "{filteredInterns.length === 0 ?")
content = content.replace("{finalExportInterns.map((intern, index) =>", "{filteredInterns.map((intern, index) =>")

# 6. Export Button UI replacement
export_btn_pattern = r"onClick=\{\(\) => setShowExportOptions\(!showExportOptions\)\}.*?\{showExportOptions && \(\s*<>\s*<div className=\"fixed inset-0 z-10\" onClick=\{\(\) => setShowExportOptions\(false\)\}></div>.*?</div>\s*</>\s*\)\}\s*</div>"
export_btn_replace = r"""onClick={() => setIsExportModalOpen(true)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm"
                        >
                            <Download className="w-4 h-4 text-blue-600" />
                            EXPORT DATA
                        </button>
                    </div>"""
content = re.sub(export_btn_pattern, export_btn_replace, content, flags=re.DOTALL)

# Also remove any rogue setShowExportOptions(false) inside downloadPDF
content = re.sub(r'^\s*setShowExportOptions\(false\);\s*$', '', content, flags=re.MULTILINE)

# 7. Modal Injection at the end
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
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                        <label className="text-sm font-medium text-gray-700">Filter by Campus</label>
                        <select
                            value={exportConfig.campus}
                            onChange={(e) => {
                                setExportConfig({ ...exportConfig, campus: e.target.value, courseId: 'all' });
                            }}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                            <option value="all">All Campuses</option>
                            <option value="islamabad">Islamabad</option>
                            <option value="bahawalpur">Bahawalpur</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Course</label>
                        <select
                            value={exportConfig.courseId}
                            onChange={(e) => setExportConfig({ ...exportConfig, courseId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                            <option value="all">All Courses</option>
                            {coursesList
                                .filter(course => course.targetAudience === 'interns')
                                .filter(course => exportConfig.campus === 'all' || course.location?.toLowerCase() === exportConfig.campus.toLowerCase() || course.city?.toLowerCase() === exportConfig.campus.toLowerCase())
                                .map(course => (
                                    <option key={course._id} value={course._id}>{course.title}</option>
                                ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Intern Status</label>
                        <select
                            value={exportConfig.status}
                            onChange={(e) => setExportConfig({ ...exportConfig, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                            <option value="all">All Interns</option>
                            <option value="active">Active Interns</option>
                            <option value="certified">Certified / Completed</option>
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
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </Modal>
"""
# Note that the regex for end_pattern might fail if there's whitespace variations, so let's use a simpler insert before final closing tags.
# Replace the final `    );\n};` or `};\nexport default`
final_export_pattern = r"(}\s*;\s*export default InternsManagement;)"
content = re.sub(final_export_pattern, modal_injection + r'\n\1', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated InternsManagement.jsx with Export Modal")
