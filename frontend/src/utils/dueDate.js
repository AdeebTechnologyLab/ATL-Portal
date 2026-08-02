export const endOfDueDate = (value) => {
    if (!value) return null;

    const dateOnly = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const dueDate = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(value);

    if (Number.isNaN(dueDate.getTime())) return null;
    dueDate.setHours(23, 59, 59, 999);
    return dueDate;
};

export const isDueDateOverdue = (value, now = new Date()) => {
    const dueDate = endOfDueDate(value);
    return dueDate ? now > dueDate : false;
};
