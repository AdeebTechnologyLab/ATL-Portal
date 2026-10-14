// sessionStorage key used to remember that the intern dismissed the reminder
// during the current session.
export const INCOMPLETE_PROFILE_DISMISS_KEY = 'incompleteProfileReminderDismissed';

// Required intern profile fields. Keep labels user-facing so they can be shown
// directly in an "incomplete profile" reminder.
const INTERN_REQUIRED_FIELDS = [
    { key: 'phone', label: 'Phone Number' },
    { key: 'education', label: 'Education' },
    { key: 'address', label: 'Home Address' },
    { key: 'city', label: 'City' },
    { key: 'guardianPhone', label: 'Guardian Phone' },
    { key: 'resumeUrl', label: 'Resume Link' },
    { key: 'requirements', label: 'Requirements' },
    { key: 'skills', label: 'My Skills' },
];

// Returns the labels of the required intern fields that are still empty.
export const getMissingInternProfileFields = (user) => {
    if (!user || user.role !== 'intern') return [];

    return INTERN_REQUIRED_FIELDS
        .filter(({ key }) => {
            const value = user[key];
            return value === undefined || value === null || String(value).trim() === '';
        })
        .map(({ label }) => label);
};

export const isInternProfileComplete = (user) =>
    user?.role === 'intern' && getMissingInternProfileFields(user).length === 0;
