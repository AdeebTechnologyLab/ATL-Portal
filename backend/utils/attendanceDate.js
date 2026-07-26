const moment = require('moment-timezone');

const ATTENDANCE_TZ = 'Asia/Karachi';

/** Calendar day in Pakistan → stored as start-of-day PKT (UTC Date) */
function parseAttendanceDateInput(dateInput) {
    if (!dateInput) return moment().tz(ATTENDANCE_TZ).startOf('day').toDate();
    if (dateInput instanceof Date) {
        return moment(dateInput).tz(ATTENDANCE_TZ).startOf('day').toDate();
    }
    const str = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return moment.tz(str, 'YYYY-MM-DD', ATTENDANCE_TZ).startOf('day').toDate();
    }
    return moment(str).tz(ATTENDANCE_TZ).startOf('day').toDate();
}

function getAttendanceDayRange(dateInput) {
    const start = moment(parseAttendanceDateInput(dateInput)).tz(ATTENDANCE_TZ).startOf('day');
    const end = start.clone().endOf('day');
    return { start: start.toDate(), end: end.toDate() };
}

function formatAttendanceDate(date) {
    if (!date) return '';
    return moment(date).tz(ATTENDANCE_TZ).format('YYYY-MM-DD');
}

/** Find attendance for a course on a PKT calendar day (handles legacy UTC-midnight docs) */
async function findAttendanceByCourseDay(Attendance, courseId, dateInput) {
    const { start, end } = getAttendanceDayRange(dateInput);
    const normalizedDate = parseAttendanceDateInput(dateInput);

    const candidates = await Attendance.find({
        course: courseId,
        date: { $gte: start, $lte: end },
    }).sort('date');

    if (!candidates.length) return null;
    if (candidates.length === 1) {
        const doc = candidates[0];
        if (doc.date.getTime() !== normalizedDate.getTime()) {
            doc.date = normalizedDate;
            await doc.save();
        }
        return doc;
    }

    const primary = candidates[0];
    primary.date = normalizedDate;

    for (let i = 1; i < candidates.length; i++) {
        const dup = candidates[i];
        for (const record of dup.records) {
            const uid = (record.user?._id || record.user)?.toString();
            const exists = primary.records.find(
                (r) => (r.user?._id || r.user)?.toString() === uid
            );
            if (!exists) primary.records.push(record);
        }
        await Attendance.deleteOne({ _id: dup._id });
    }

    await primary.save();
    return primary;
}

module.exports = {
    ATTENDANCE_TZ,
    parseAttendanceDateInput,
    getAttendanceDayRange,
    formatAttendanceDate,
    findAttendanceByCourseDay,
};
