import re

filepath = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\InternsManagement.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject finalExportInterns definition
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
content = content.replace("const doc = new jsPDF('l', 'mm', 'a4');", "const doc = new jsPDF('l', 'mm', 'a4');\n" + filter_code)

# 2. Fix showToast to alert
content = re.sub(r"showToast\.success\('.*?', '.*?', Trash2\);", "alert('The fee and enrollment record has been permanently removed.');", content)
content = re.sub(r"showToast\.error\('.*?', '.*?'\);", "alert('Failed to delete record');", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ESLint syntax errors in InternsManagement.jsx")
