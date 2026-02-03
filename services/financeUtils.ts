import { Transaction, CreditCard, RecurringExpense, InstallmentPurchase } from '../types';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const getMonthKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const calculateCardUsage = (cardId: string, transactions: Transaction[], monthKey: string) => {
  // Simple calculation: sum of all expenses on this card for current billing cycle
  // For simplicity in this demo, we assume billing cycle ~ calendar month roughly or total outstanding
  // A robust system checks closing dates. Here we calculate Total Unpaid.
  const cardTx = transactions.filter(t => t.cardId === cardId && t.type === 'expense');
  return cardTx.reduce((acc, t) => acc + t.amount, 0);
};

export const checkRecurringExpenses = (
  expenses: RecurringExpense[],
  transactions: Transaction[],
  addTransaction: (t: Omit<Transaction, 'id'>) => void,
  updateExpenseLastMonth: (id: string, month: string) => void
) => {
  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const currentDay = today.getDate();

  expenses.forEach(exp => {
    if (!exp.active) return;

    // Performance Optimization: Check transient memory
    if (exp.lastGeneratedMonth === currentMonthKey) return;

    // --- STRUCTURAL PROTECTION (Double Layer) ---
    const alreadyExists = transactions.some(t => {
      const txMonth = t.date.slice(0, 7);

      // Layer 1: Match by ID link
      const idMatch = t.recurringExpenseId === exp.id;

      // Layer 2: Fingerprint matching (Description + Amount + Month)
      // This protects against duplicates even if the SQL column for recurringExpenseId is missing
      const fingerprintMatch =
        t.description.includes(exp.name) &&
        Math.abs(t.amount - exp.amount) < 0.01 &&
        txMonth === currentMonthKey;

      return (idMatch || fingerprintMatch) && txMonth === currentMonthKey;
    });

    if (alreadyExists) {
      updateExpenseLastMonth(exp.id, currentMonthKey);
      return;
    }

    // --- EXECUTION ---
    if (currentDay >= exp.dueDay) {
      const newTx: Omit<Transaction, 'id'> = {
        description: `(Fixo) ${exp.name}`,
        amount: exp.amount,
        type: 'expense',
        date: today.toISOString().split('T')[0],
        categoryId: exp.categoryId,
        isRecurring: true,
        recurringExpenseId: exp.id
      };

      addTransaction(newTx);
      updateExpenseLastMonth(exp.id, currentMonthKey);
    }
  });
};

export const checkInstallments = (
  installments: InstallmentPurchase[],
  transactions: Transaction[],
  addTransaction: (t: Omit<Transaction, 'id'>) => void,
  updateInstallment: (i: InstallmentPurchase) => void
) => {
  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const currentDay = today.getDate();

  installments.forEach(inst => {
    // Skip if cancelled or already completed (unless logic finds it shouldn't be completed, but we handle status updates here)
    if (inst.status === 'cancelled') return;

    // Count how many transactions exist for this installment to determine "current installment number"
    const relatedTransactions = transactions.filter(t => t.installmentId === inst.id);
    const paidCount = relatedTransactions.length;

    // Check completion status
    if (paidCount >= inst.totalInstallments && inst.status !== 'completed') {
      updateInstallment({ ...inst, status: 'completed' });
      return;
    }

    // If already completed, stop
    if (inst.status === 'completed') return;

    // Generate logic
    if (inst.lastGeneratedMonth !== currentMonthKey && currentDay >= inst.dueDay) {
      // Logic check: only generate if we haven't reached total installments
      if (paidCount < inst.totalInstallments) {
        const currentNumber = paidCount + 1;

        const newTx: Omit<Transaction, 'id'> = {
          description: `${inst.description} (${currentNumber}/${inst.totalInstallments})`,
          amount: inst.installmentAmount,
          type: 'expense',
          date: today.toISOString().split('T')[0],
          categoryId: inst.categoryId,
          cardId: inst.cardId,
          installmentId: inst.id
        };

        addTransaction(newTx);

        // Update installment last generated month
        // Also check if this was the last one to update status immediately
        const newStatus = currentNumber >= inst.totalInstallments ? 'completed' : 'active';
        updateInstallment({
          ...inst,
          status: newStatus,
          lastGeneratedMonth: currentMonthKey
        });
      }
    }
  });
};