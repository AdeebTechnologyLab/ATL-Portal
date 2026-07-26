import re

# 1. Update Sidebar.jsx
sidebar_path = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\components\layout\Sidebar.jsx'
with open(sidebar_path, 'r', encoding='utf-8') as f:
    sidebar_content = f.read()

job_nav_replacement = """            job: [
                { id: 'available', labelKey: 'Available', icon: Briefcase, path: '/job/tasks', state: { tab: 'available' } },
                { id: 'applied', labelKey: 'My Applications', icon: FileText, path: '/job/tasks', state: { tab: 'applied' } },
                { id: 'assigned', labelKey: 'Assigned', icon: CheckCircle, path: '/job/tasks', state: { tab: 'assigned' } },
                { id: 'completed', labelKey: 'Completed', icon: Award, path: '/job/tasks', state: { tab: 'completed' } },
                { id: 'expired', labelKey: 'Expired', icon: Clock, path: '/job/tasks', state: { tab: 'expired' } },
                { id: 'showcase', labelKey: 'Work Feedback', icon: MessageSquare, path: '/job/tasks', state: { tab: 'showcase' } },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/job/profile' },
            ],"""

sidebar_content = re.sub(
    r"job:\s*\[\s*\{\s*id:\s*'tasks'.*?\n\s*\{\s*id:\s*'profile'.*?\n\s*\],",
    job_nav_replacement,
    sidebar_content,
    flags=re.DOTALL
)

# Also need to make sure t() won't break for non-translated keys. The t() function has a defaultValue fallback in most i18next configs, but let's check. Wait, in Sidebar it does `t(item.labelKey)`. If the key is not in JSON, it just shows the key.
# I'll update Sidebar to check if labelKey contains '.' to use t(), else just use the string directly or pass it to t() which will return the string if not found.
# Actually, the user has existing translations. I will just provide the strings directly. In Sidebar.jsx: `t(item.labelKey, { defaultValue: item.labelKey.includes('.') ? undefined : item.labelKey })` or something. Wait, in Sidebar:
# `<span className="font-medium flex-1">{t(item.labelKey)}</span>`
# It's better to just add the keys to the translation files OR just pass the literal English strings. Since `t('Available')` will return 'Available' if missing, it's fine.

with open(sidebar_path, 'w', encoding='utf-8') as f:
    f.write(sidebar_content)


# 2. Update BrowseTasks.jsx
tasks_path = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\job\BrowseTasks.jsx'
with open(tasks_path, 'r', encoding='utf-8') as f:
    tasks_content = f.read()

# Add useLocation
if "useLocation" not in tasks_content:
    tasks_content = tasks_content.replace(
        "import { useSelector } from 'react-redux';",
        "import { useSelector } from 'react-redux';\nimport { useLocation } from 'react-router-dom';"
    )

# Add useLocation hook and effect
hook_code = """    const location = useLocation();
    
    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location.state]);"""

if "const location = useLocation();" not in tasks_content:
    tasks_content = tasks_content.replace(
        "const [currentImageIndex, setCurrentImageIndex] = useState(0);",
        "const [currentImageIndex, setCurrentImageIndex] = useState(0);\n\n" + hook_code
    )

# Remove the tabs UI
tabs_regex = r"\{\/\* Tabs \*\/\}.*?<\/div>\s*<\/div>"
tasks_content = re.sub(tabs_regex, "", tasks_content, flags=re.DOTALL)

with open(tasks_path, 'w', encoding='utf-8') as f:
    f.write(tasks_content)

print("Updated Sidebar and BrowseTasks")
