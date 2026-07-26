import re

filepath = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\StudentsManagement.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the dropdown export button block
export_block_pattern = r"onClick=\{\(\) => setShowExportOptions\(!showExportOptions\)\}.*?\{showExportOptions && \(\s*<>\s*<div className=\"fixed inset-0 z-10\" onClick=\{\(\) => setShowExportOptions\(false\)\}></div>.*?</>\s*\)\}\s*</div>"
export_block_replace = r"""onClick={() => setIsExportModalOpen(true)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm"
                        >
                            <Download className="w-4 h-4 text-primary" />
                            EXPORT DATA
                        </button>
                    </div>"""
content = re.sub(export_block_pattern, export_block_replace, content, flags=re.DOTALL)

# 2. Fix the setShowExportOptions(false) inside downloadPDF if it exists
content = re.sub(r'^\s*setShowExportOptions\(false\);\s*$', '', content, flags=re.MULTILINE)

# 3. Fix showToast
content = re.sub(r"showToast\.success\('.*?', '.*?', Trash2\);", "alert('The fee and enrollment record has been permanently removed.');", content)
content = re.sub(r"showToast\.error\('.*?', '.*?'\);", "alert('Failed to delete record');", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ESLint syntax errors in StudentsManagement.jsx")
