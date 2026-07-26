const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'i18n', 'locales');

const teacherTranslations = {
    en: {
        teacherDashboard: {
            pendingTasksDashboard: "Pending Tasks Dashboard",
            showingCoursesGrading: "Showing courses that require grading attention",
            courses: "Courses",
            searchStudent: "Search Student...",
            googleMeetLink: "Google Meet Link",
            startAdeebMeet: "Start Adeeb Meet",
            activeCourses: "Active Courses",
            activeStudents: "Active Students",
            activeInterns: "Active Interns",
            pendingGradings: "Pending Gradings",
            todaysPresent: "Today's Present",
            todaysAbsent: "Today's Absent",
            searchCourse: "Search Course or Teacher..."
        }
    },
    ur: {
        teacherDashboard: {
            pendingTasksDashboard: "زیر التواء ٹاسک ڈیش بورڈ",
            showingCoursesGrading: "ایسے کورسز دکھا رہے ہیں جنہیں گریڈنگ کی ضرورت ہے",
            courses: "کورسز",
            searchStudent: "طالب علم تلاش کریں...",
            googleMeetLink: "گوگل میٹ لنک",
            startAdeebMeet: "ادیب میٹ شروع کریں",
            activeCourses: "فعال کورسز",
            activeStudents: "فعال طلباء",
            activeInterns: "فعال انٹرنز",
            pendingGradings: "زیر التواء گریڈنگ",
            todaysPresent: "آج کے حاضر",
            todaysAbsent: "آج کے غیر حاضر",
            searchCourse: "کورس یا استاد تلاش کریں..."
        }
    },
    hi: {
        teacherDashboard: {
            pendingTasksDashboard: "लंबित कार्य डैशबोर्ड",
            showingCoursesGrading: "ऐसे कोर्स दिखा रहे हैं जिन्हें ग्रेडिंग की आवश्यकता है",
            courses: "कोर्स",
            searchStudent: "छात्र खोजें...",
            googleMeetLink: "गूगल मीट लिंक",
            startAdeebMeet: "अदीब मीट शुरू करें",
            activeCourses: "सक्रिय कोर्स",
            activeStudents: "सक्रिय छात्र",
            activeInterns: "सक्रिय इंटर्न",
            pendingGradings: "लंबित ग्रेडिंग",
            todaysPresent: "आज के उपस्थित",
            todaysAbsent: "आज के अनुपस्थित",
            searchCourse: "कोर्स या शिक्षक खोजें..."
        }
    },
    ar: {
        teacherDashboard: {
            pendingTasksDashboard: "لوحة المهام المعلقة",
            showingCoursesGrading: "عرض الدورات التي تتطلب الدرجات",
            courses: "الدورات",
            searchStudent: "البحث عن طالب...",
            googleMeetLink: "رابط جوجل ميت",
            startAdeebMeet: "بدء أديب ميت",
            activeCourses: "الدورات النشطة",
            activeStudents: "الطلاب النشطون",
            activeInterns: "المتدربون النشطون",
            pendingGradings: "الدرجات المعلقة",
            todaysPresent: "حضور اليوم",
            todaysAbsent: "غياب اليوم",
            searchCourse: "البحث عن دورة أو معلم..."
        }
    }
};

['en', 'ur', 'hi', 'ar'].forEach(lang => {
    const filePath = path.join(localesPath, `${lang}.json`);
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    fileData.teacherDashboard = teacherTranslations[lang].teacherDashboard;
    
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    console.log(`Updated ${lang}.json with teacherTranslations`);
});
