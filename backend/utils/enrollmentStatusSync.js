/**
 * Enrollment status <-> certificate passoutDate sync.
 *
 * Rule: jab tak certificate ka passoutDate aa nahi jata, enrollment 'completed'
 * NAHI hogi — 'enrolled' rahegi taake live classes / meeting logs / attendance
 * sab us user ke liye chalte rahein. PassoutDate guzarne par enrollment
 * 'completed' ho jati hai (completedAt = passoutDate ya issue date).
 *
 * Empty/missing passoutDate = foran release (purane certificates ke sath
 * backward compatible).
 */

const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');

const parsePassoutDay = (passoutDate) => {
    if (!passoutDate) return null;
    const raw = String(passoutDate).trim();
    if (!raw) return null;

    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
        // Local calendar day (UTC timezone off-by-one se bachne ke liye)
        return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isPassoutDateReached = (passoutDate) => {
    const day = parsePassoutDay(passoutDate);
    if (!day) return true;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return day.getTime() <= startOfToday.getTime();
};

/**
 * Diye gaye certificates ke sath linked enrollments ko sync karta hai:
 *  - passoutDate aane par -> 'completed'
 *  - passoutDate abhi door ho aur enrollment 'completed' ho -> wapas 'enrolled'
 * Returns: [{ enrollmentId, action: 'completed' | 'reopened' }]
 */
const syncEnrollmentStatusesForCertificates = async (certificates) => {
    const results = [];

    for (const cert of certificates || []) {
        const courseId = cert.course?._id || cert.course;
        const userId = cert.user?._id || cert.user;
        if (!courseId || !userId) continue;

        const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (!enrollment) continue;

        const released = isPassoutDateReached(cert.passoutDate);

        if (released && enrollment.status !== 'completed') {
            if (!enrollment.completedAt) {
                const day = parsePassoutDay(cert.passoutDate);
                const issued = cert.issuedAt ? new Date(cert.issuedAt) : null;
                enrollment.completedAt = (day && (!issued || day > issued)) ? day : (issued || new Date());
            }
            enrollment.status = 'completed';
            await enrollment.save();
            results.push({ enrollmentId: enrollment._id, action: 'completed' });
        } else if (!released && enrollment.status === 'completed') {
            enrollment.status = 'enrolled';
            enrollment.completedAt = null;
            await enrollment.save();
            results.push({ enrollmentId: enrollment._id, action: 'reopened' });
        }
    }

    return results;
};

/**
 * Saare course certificates ke enrollments sync (daily cron ke liye).
 */
const syncAllCertificateEnrollments = async () => {
    const certificates = await Certificate.find({ course: { $ne: null } })
        .select('user course passoutDate issuedAt');
    if (certificates.length === 0) return [];
    return syncEnrollmentStatusesForCertificates(certificates);
};

module.exports = {
    isPassoutDateReached,
    syncEnrollmentStatusesForCertificates,
    syncAllCertificateEnrollments
};
