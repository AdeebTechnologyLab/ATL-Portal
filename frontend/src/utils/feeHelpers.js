/** Installment is outstanding until admin verifies payment */
export const isOutstandingInstallment = (status) => status !== 'verified';

export const calculateOutstandingFees = (fees = []) => {
    let totalAmount = 0;
    let count = 0;
    let overdueInstallment = null;

    fees.forEach((fee) => {
        (fee.installments || []).forEach((inst) => {
            if (isOutstandingInstallment(inst.status)) {
                totalAmount += inst.amount || 0;
                count += 1;
                if (!overdueInstallment || new Date(inst.dueDate) < new Date(overdueInstallment.dueDate)) {
                    overdueInstallment = {
                        amount: inst.amount,
                        dueDate: inst.dueDate,
                        installmentNumber: inst.installmentNumber || count,
                        courseTitle: fee.course?.title || fee.course?.name || '',
                    };
                }
            }
        });
    });

    return { totalAmount, count, overdueInstallment };
};
