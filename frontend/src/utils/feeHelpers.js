/** Installment is outstanding until admin verifies payment */
export const isOutstandingInstallment = (status) => status !== 'verified';

export const calculateOutstandingFees = (fees = []) => {
    let totalAmount = 0;
    let count = 0;

    fees.forEach((fee) => {
        (fee.installments || []).forEach((inst) => {
            if (isOutstandingInstallment(inst.status)) {
                totalAmount += inst.amount || 0;
                count += 1;
            }
        });
    });

    return { totalAmount, count };
};
