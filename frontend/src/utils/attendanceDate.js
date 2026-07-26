const ATTENDANCE_TZ = 'Asia/Karachi';

/** YYYY-MM-DD for the attendance calendar day in Pakistan */
export function toAttendanceDateKey(dateInput) {
    if (!dateInput) return getTodayAttendanceDateKey();
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: ATTENDANCE_TZ }).format(d);
}

export function getTodayAttendanceDateKey() {
    return toAttendanceDateKey(new Date());
}

/** Local browser date picker value (teacher in PK = same calendar day) */
export function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatAttendanceDateDisplay(dateInput) {
    const key = toAttendanceDateKey(dateInput);
    if (!key) return 'N/A';
    const [y, m, d] = key.split('-').map(Number);
    const label = new Date(y, m - 1, d);
    return label.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatAttendanceWeekday(dateInput) {
    const key = toAttendanceDateKey(dateInput);
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long' });
}
