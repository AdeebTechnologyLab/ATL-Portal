import re

# 1. Update PaidTasksManagement.jsx (Admin)
path_paid_tasks = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\PaidTasksManagement.jsx'
with open(path_paid_tasks, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the IIFE for IconComponent in PaidTasksManagement.jsx
# It looks like:
# {(() => {
#     const IconComponent = getCategoryIcon(task.category);
#     return (
#         <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryBg(task.category)}`}>
#             <IconComponent className={`w-6 h-6 ${getCategoryColor(task.category)}`} />
#         </div>
#     );
# })()}
regex_iife = r"\{\(\(\)\s*=>\s*\{[^{}]*const IconComponent = getCategoryIcon\(task\.category\);[^{}]*return\s*\(\s*<div[^>]*w-12 h-12[^>]*>[^<]*<IconComponent[^>]*/>\s*</div>\s*\);\s*\}\)\(\)\}"

content = re.sub(regex_iife, "", content)
# Also change justify-between to justify-end if the icon is removed so the right side items don't float left.
# Wait, replacing `justify-between mb-4` to `justify-end mb-4` only around the badges might be tricky with regex. Let's just leave it, it's fine. Actually, if I just replace `justify-between` -> `justify-end` in that specific div:
content = re.sub(r'<div className="flex items-start justify-between mb-4">\s*(<Badge|<div)', r'<div className="flex items-start justify-end mb-4">\n                                              \1', content)

with open(path_paid_tasks, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update BrowseTasks.jsx (User)
path_browse_tasks = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\job\BrowseTasks.jsx'
with open(path_browse_tasks, 'r', encoding='utf-8') as f:
    content = f.read()

# In BrowseTasks, it's:
# <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryBg(task.category)}`}>
#     {renderCategoryIcon(task.category)}
# </div>
regex_icon_div = r"<div className=\{`w-12 h-12[^`]*\`\}>\s*\{renderCategoryIcon\(task\.category\)\}\s*</div>"
content = re.sub(regex_icon_div, "", content)
content = re.sub(r'<div className="flex items-start justify-between mb-4">\s*(<div)', r'<div className="flex items-start justify-end mb-4">\n                                  \1', content)

with open(path_browse_tasks, 'w', encoding='utf-8') as f:
    f.write(content)


# 3. Update CourseManagement.jsx (Admin)
path_course_mgmt = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\CourseManagement.jsx'
with open(path_course_mgmt, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove <Icon className="w-16 h-16 text-white/30" />
content = re.sub(r'<Icon className="w-16 h-16 text-white/30" />', "", content)

with open(path_course_mgmt, 'w', encoding='utf-8') as f:
    f.write(content)


# 4. Update BrowseCourses.jsx (User)
path_browse_courses = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\student\BrowseCourses.jsx'
with open(path_browse_courses, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove <Icon className="w-16 h-16 text-white/30" />
content = re.sub(r'<Icon className="w-16 h-16 text-white/30" />', "", content)

with open(path_browse_courses, 'w', encoding='utf-8') as f:
    f.write(content)

print("Icons removed from all 4 files.")
