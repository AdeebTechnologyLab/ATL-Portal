import { enrollmentAPI } from '../services/api';

// An enrollment counts as "fee cleared" once the first (activation) installment
// is verified by the admin. Until then the student/intern should be pushed to the
// fee payment screen right after login.
const isEnrollmentFeeCleared = (enrollment) => {
    if (!enrollment) return true;
    if (enrollment.status === 'completed') return true;
    if (enrollment.status === 'enrolled') return true;
    if (enrollment.isActive) return true;
    if (enrollment.feeStatus === 'verified') return true;
    return enrollment.installments?.[0]?.status === 'verified';
};

// Resolve where a student/intern should land immediately after login:
//   - no enrollment yet            -> courses/skills screen
//   - enrolled but fee not cleared -> fee payment screen
//   - otherwise                    -> their usual default page
export const getStudentLandingPath = async (role) => {
    const base = role === 'intern' ? '/intern' : '/student';
    const defaultPath = role === 'intern' ? `${base}/dashboard` : `${base}/profile`;

    try {
        const res = await enrollmentAPI.getMy();
        const enrollments = res.data?.data || [];

        if (enrollments.length === 0) {
            return `${base}/courses`;
        }

        const hasPendingFee = enrollments.some((enrollment) => !isEnrollmentFeeCleared(enrollment));
        if (hasPendingFee) {
            return `${base}/fees`;
        }

        return defaultPath;
    } catch (error) {
        console.error('Failed to resolve post-login landing page:', error);
        return defaultPath;
    }
};
