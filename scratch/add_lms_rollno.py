import re

# Students
filepath_students = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\StudentsManagement.jsx'
with open(filepath_students, 'r', encoding='utf-8') as f:
    content_s = f.read()

# Replace all occurrences of 'Roll No' in headers with 'LMS Roll No'
content_s = content_s.replace("'Roll No'", "'LMS Roll No'")

with open(filepath_students, 'w', encoding='utf-8') as f:
    f.write(content_s)

# Interns
filepath_interns = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\InternsManagement.jsx'
with open(filepath_interns, 'r', encoding='utf-8') as f:
    content_i = f.read()

# Phone
content_i = content_i.replace(
    "headers = [['Name', 'Phone', 'Identity']];",
    "headers = [['LMS Roll No', 'Name', 'Phone', 'Identity']];"
)
content_i = content_i.replace(
    "body = finalExportInterns.map(i => [i.name || 'N/A', i.phone || 'N/A', 'Intern']);",
    "body = finalExportInterns.map(i => [i.rollNo || 'N/A', i.name || 'N/A', i.phone || 'N/A', 'Intern']);"
)

# Email
content_i = content_i.replace(
    "headers = [['Name', 'Email', 'Identity']];",
    "headers = [['LMS Roll No', 'Name', 'Email', 'Identity']];"
)
content_i = content_i.replace(
    "body = finalExportInterns.map(i => [i.name || 'N/A', i.email || 'N/A', 'Intern']);",
    "body = finalExportInterns.map(i => [i.rollNo || 'N/A', i.name || 'N/A', i.email || 'N/A', 'Intern']);"
)

# Academic
content_i = content_i.replace(
    "headers = [['University Roll No', 'Name', 'Degree', 'University', 'CGPA', 'Semester', 'Registered \\nCourses']];",
    "headers = [['LMS Roll No', 'University Roll No', 'Name', 'Degree', 'University', 'CGPA', 'Semester', 'Registered \\nCourses']];"
)
# Note: '\nCourses' is broken across lines in actual file, let's use regex for headers and body to be safe.
import re

# Academic Header
content_i = re.sub(
    r"headers = \[\['University Roll No',\s*'Name',\s*'Degree',",
    r"headers = [['LMS Roll No', 'University Roll No', 'Name', 'Degree',",
    content_i
)
# Academic Body
content_i = re.sub(
    r"body = finalExportInterns\.map\(i => \[\s*i\.rollNumber \|\| 'N/A',\s*i\.name \|\| 'N/A',",
    r"body = finalExportInterns.map(i => [\n                i.rollNo || 'N/A',\n                i.rollNumber || 'N/A',\n                i.name || 'N/A',",
    content_i
)

with open(filepath_interns, 'w', encoding='utf-8') as f:
    f.write(content_i)

print("Updated LMS Roll No in PDF headers and rows for both Students and Interns.")
