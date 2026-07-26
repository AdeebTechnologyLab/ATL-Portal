let currentDateFormat = localStorage.getItem('date-format') || 'DD MMM YYYY';
let currentTimeFormat = localStorage.getItem('time-format') || '12-hour';

if (typeof window !== 'undefined') {
    window.addEventListener('format-changed', () => {
        currentDateFormat = localStorage.getItem('date-format') || 'DD MMM YYYY';
        currentTimeFormat = localStorage.getItem('time-format') || '12-hour';
    });
}

/**
 * Standardized Date Formatter for LMS
 */
export const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const dateNum = d.getDate();

    const monthShort = d.toLocaleString('en-US', { month: 'short' });
    const monthNumStr = String(monthIndex + 1).padStart(2, '0');
    const dateNumStr = String(dateNum).padStart(2, '0');

    switch (currentDateFormat) {
        case 'MM/DD/YYYY':
            return `${monthNumStr}/${dateNumStr}/${year}`;
        case 'DD/MM/YYYY':
            return `${dateNumStr}/${monthNumStr}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${monthNumStr}-${dateNumStr}`;
        case 'DD MMM YYYY':
        default:
            return `${dateNumStr} ${monthShort} ${year}`;
    }
};

export const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: currentTimeFormat === '12-hour'
    });
};

export const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return `${formatDate(d)} at ${formatTime(d)}`;
};
