import re

files = [
    r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\StudentsManagement.jsx',
    r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\InternsManagement.jsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the doc.text for Total Records
    total_records_pattern = r"(doc\.text\(`Total Records: \$\{finalExport(?:Students|Interns)\.length\}`,\s*14,\s*37\);)"
    
    # We need to inject the filter variables right after creating doc but before setting text
    doc_creation_pattern = r"(const doc = new jsPDF\('l', 'mm', 'a4'\);(?: // Use landscape for wide tables)?)"
    
    filter_vars = """
        const courseName = courseId === 'all' ? 'All Courses' : (coursesList.find(c => c._id === courseId)?.title || 'All Courses');
        const campusName = campus === 'all' ? 'All Campuses' : (campus === 'islamabad' ? 'Islamabad' : 'Bahawalpur');
        const statusName = status === 'all' ? 'All' : (status === 'active' ? 'Active' : 'Certified');
"""
    
    # Inject filter vars
    if "const courseName =" not in content:
        content = re.sub(doc_creation_pattern, r"\1" + filter_vars, content)
    
    # Inject text into PDF
    pdf_text_injection = r"\1\n        doc.setFontSize(10);\n        doc.text(`Filters -> Campus: ${campusName} | Course: ${courseName} | Status: ${statusName}`, 14, 44);"
    if "Filters -> Campus:" not in content:
        content = re.sub(total_records_pattern, pdf_text_injection, content)
    
    # Adjust autoTable startY from 45 to 52
    content = re.sub(r"startY:\s*45", "startY: 52", content)
    
    # Update doc.save filename
    entity = "Students" if "StudentsManagement" in filepath else "Interns"
    save_pattern = r"doc\.save\(`AdeebTechLab-.*?\.pdf`\);"
    new_save = f"const fileName = `AdeebTechLab_{entity}_${{type}}_${{campusName}}_${{courseName}}_${{statusName}}.pdf`.replace(/ /g, '_');\n        doc.save(fileName);"
    
    if "const fileName = `AdeebTechLab_" not in content:
        content = re.sub(save_pattern, new_save, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated PDF reports to include selected filters in content and filename.")
