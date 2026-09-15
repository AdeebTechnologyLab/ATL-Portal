/**
 * Default Help & Support data owned by the backend.
 *
 * The production backend is deployed without the frontend source tree, so this
 * must not import from frontend/src. The admin can edit these values later in
 * the Help & Support panel; they are only used when the database has no saved
 * help content yet.
 */
const FAQ_HIGHLIGHTS = [
    { label: 'Campuses', value: '2', sub: 'Bahawalpur & Islamabad' },
    { label: 'Courses', value: '34+', sub: 'Professional programs' },
    { label: 'Students', value: '5000+', sub: 'Trained successfully' },
    { label: 'Trainers', value: '50', sub: 'Expert faculty' }
];

const createItems = (prefix, entries) => entries.map(([q, a, links], index) => ({
    id: `${prefix}${index + 1}`,
    q,
    a,
    ...(links ? { links } : {})
}));

const FAQ_SECTIONS = [
    {
        id: 'general', title: 'General Questions', titleEn: 'General Questions',
        items: createItems('general-', [
            ['What is Adeeb Technology Lab?', 'Adeeb Technology Lab is a professional computer training institute offering modern IT and digital skills courses.'],
            ['Where is Adeeb Technology Lab located?', 'Our campuses are located in Bahawalpur and Islamabad.'],
            ['Are certificates provided upon completion?', 'Yes, recognized certificates are provided upon successful completion of a course.'],
            ['Can beginners join the courses?', 'Yes, beginners are welcome. Courses start from the basics.']
        ])
    },
    {
        id: 'admission', title: 'Admissions', titleEn: 'Admission Questions',
        items: createItems('admission-', [
            ['How can I secure admission?', 'You can apply online or visit either campus.'],
            ['Are fee installment plans available?', 'Yes, flexible monthly installment plans are available.'],
            ['What documents are required for admission?', 'CNIC/B-Form, academic documents, and passport-size photographs are required.']
        ])
    },
    {
        id: 'contact', title: 'Contact Information', titleEn: 'Contact Questions',
        items: createItems('contact-', [
            ['What is the official email address?', 'info.AdeebTechLab@gmail.com', [{ type: 'email', href: 'mailto:info.AdeebTechLab@gmail.com', label: 'info.AdeebTechLab@gmail.com' }]],
            ['What are the class timings?', 'Classes are held Monday through Saturday, from 10:00 AM to 10:00 PM.']
        ])
    }
];

module.exports = { FAQ_HIGHLIGHTS, FAQ_SECTIONS };
