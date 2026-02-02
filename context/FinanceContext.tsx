import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AppState, Transaction, Category, CreditCard, RecurringExpense, FinancialGoal, Investment, InstallmentPurchase
} from '../types';
import { loadState, saveState, INITIAL_STATE } from '../services/storage';
import { checkRecurringExpenses, checkInstallments, getMonthKey, generateUUID } from '../services/financeUtils';
import { useAuth } from './AuthContext';

interface FinanceContextType extends AppState {
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  addCard: (c: Omit<CreditCard, 'id'>) => void;
  deleteCard: (id: string) => void;

  addRecurring: (r: Omit<RecurringExpense, 'id' | 'lastGeneratedMonth'>) => void;
  deleteRecurring: (id: string) => void;

  addInstallment: (i: Omit<InstallmentPurchase, 'id' | 'lastGeneratedMonth' | 'status'>) => void;
  updateInstallment: (i: InstallmentPurchase) => void;
  deleteInstallment: (id: string, deleteTransactions: boolean) => void;
  payNextInstallment: (id: string) => void;
  undoLastInstallment: (id: string) => void;

  addGoal: (g: Omit<FinancialGoal, 'id'>) => void;
  updateGoal: (g: FinancialGoal) => void;
  deleteGoal: (id: string) => void;

  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (i: Investment) => void;

  setBalanceOffset: (val: number) => void;
  toggleDarkMode: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Load state when User changes
  useEffect(() => {
    if (user) {
      const loaded = loadState(user.id);
      setState(loaded);
    } else {
      setState(INITIAL_STATE);
    }
  }, [user]);

  // Persistence Effect
  useEffect(() => {
    if (user) {
      saveState(state, user.id);
    }

    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state, user]);

  // Recurring Checker Effect
  useEffect(() => {
    if (!user) return;
    checkRecurringExpenses(
      state.recurringExpenses,
      (tx) => addTransaction(tx),
      (id, month) => {
        setState(prev => ({
          ...prev,
          recurringExpenses: prev.recurringExpenses.map(r =>
            r.id === id ? { ...r, lastGeneratedMonth: month } : r
          )
        }));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurringExpenses, user]);

  // Installments Checker Effect
  useEffect(() => {
    if (!user) return;
    // Must use a function reference that doesn't trigger loops
    // We pass the current state of transactions for the check
    if (state.installments.length > 0) {
      checkInstallments(
        state.installments,
        state.transactions,
        (tx) => addTransaction(tx),
        (inst) => updateInstallment(inst)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.installments, state.transactions.length, user]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx = { ...t, id: generateUUID() };
    setState(prev => {
      // Logic: If linked to a goal, update goal progress automatically
      // But user can override this via updateGoal manual functionality
      let newGoals = prev.goals;
      if (t.goalId && t.type === 'income') {
        newGoals = prev.goals.map(g =>
          g.id === t.goalId ? { ...g, currentAmount: g.currentAmount + t.amount } : g
        );
      }
      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        goals: newGoals
      };
    });
  };

  const updateTransaction = (t: Transaction) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx => tx.id === t.id ? t : tx)
    }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => {
      // Reverse goal impact if needed
      const tx = prev.transactions.find(t => t.id === id);
      let newGoals = prev.goals;
      if (tx && tx.goalId && tx.type === 'income') {
        newGoals = prev.goals.map(g =>
          g.id === tx.goalId ? { ...g, currentAmount: g.currentAmount - tx.amount } : g
        );
      }
      return {
        ...prev,
        transactions: prev.transactions.filter(tx => tx.id !== id),
        goals: newGoals
      };
    });
  };

  const addCategory = (c: Omit<Category, 'id'>) => {
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, { ...c, id: generateUUID() }]
    }));
  };

  const updateCategory = (c: Category) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat => cat.id === c.id ? c : cat)
    }));
  };

  const deleteCategory = (id: string) => {
    if (state.transactions.some(t => t.categoryId === id) || state.recurringExpenses.some(r => r.categoryId === id)) {
      console.warn('Cannot delete category in use');
      return;
    }
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
  };

  const addCard = (c: Omit<CreditCard, 'id'>) => {
    setState(prev => ({
      ...prev,
      cards: [...prev.cards, { ...c, id: generateUUID() }]
    }));
  };

  const deleteCard = (id: string) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== id),
      transactions: prev.transactions.map(t => t.cardId === id ? { ...t, cardId: undefined } : t)
    }));
  };

  const addRecurring = (r: Omit<RecurringExpense, 'id' | 'lastGeneratedMonth'>) => {
    setState(prev => ({
      ...prev,
      recurringExpenses: [...prev.recurringExpenses, {
        ...r,
        id: generateUUID(),
        lastGeneratedMonth: '' // Will trigger on next check if date matches
      }]
    }));
  };

  const deleteRecurring = (id: string) => {
    setState(prev => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.filter(r => r.id !== id)
    }));
  };

  const addInstallment = (i: Omit<InstallmentPurchase, 'id' | 'lastGeneratedMonth' | 'status'>) => {
    setState(prev => ({
      ...prev,
      installments: [...prev.installments, {
        ...i,
        id: generateUUID(),
        status: 'active',
        lastGeneratedMonth: '' // Will trigger on check
      }]
    }));
  };

  const updateInstallment = (i: InstallmentPurchase) => {
    setState(prev => ({
      ...prev,
      installments: prev.installments.map(inst => inst.id === i.id ? i : inst)
    }));
  };

  const deleteInstallment = (id: string, deleteTransactions: boolean) => {
    setState(prev => ({
      ...prev,
      installments: prev.installments.filter(i => i.id !== id),
      transactions: deleteTransactions
        ? prev.transactions.filter(t => t.installmentId !== id)
        : prev.transactions.map(t => t.installmentId === id ? { ...t, installmentId: undefined } : t) // unlink if keeping
    }));
  };

  const payNextInstallment = (id: string) => {
    setState(prev => {
      const inst = prev.installments.find(i => i.id === id);
      if (!inst) return prev;

      const paidCount = prev.transactions.filter(t => t.installmentId === id).length;
      if (paidCount >= inst.totalInstallments) {
        return prev; // Already paid
      }

      const nextNumber = paidCount + 1;
      const today = new Date();
      const currentMonthKey = getMonthKey(today);

      const newTx: Transaction = {
        id: generateUUID(),
        description: `${inst.description} (${nextNumber}/${inst.totalInstallments})`,
        amount: inst.installmentAmount,
        type: 'expense',
        date: today.toISOString().split('T')[0],
        categoryId: inst.categoryId,
        cardId: inst.cardId,
        installmentId: inst.id
      };

      const newStatus = nextNumber >= inst.totalInstallments ? 'completed' : 'active';

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        installments: prev.installments.map(i => i.id === id ? {
          ...i,
          status: newStatus,
          lastGeneratedMonth: currentMonthKey // Update to prevent auto-gen in same month
        } : i)
      };
    });
  };

  const undoLastInstallment = (id: string) => {
    setState(prev => {
      const inst = prev.installments.find(i => i.id === id);
      if (!inst) return prev;

      const relatedTransactions = prev.transactions
        .filter(t => t.installmentId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (relatedTransactions.length === 0) return prev;

      const lastTx = relatedTransactions[0];

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== lastTx.id),
        installments: prev.installments.map(i => i.id === id ? { ...i, status: 'active' } : i)
      };
    });
  };

  const addGoal = (g: Omit<FinancialGoal, 'id'>) => {
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, { ...g, id: generateUUID() }]
    }));
  };

  const updateGoal = (g: FinancialGoal) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(goal => goal.id === g.id ? g : goal)
    }));
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
  };

  const addInvestment = (i: Omit<Investment, 'id'>) => {
    setState(prev => ({
      ...prev,
      investments: [...prev.investments, { ...i, id: generateUUID() }]
    }));
  };

  const updateInvestment = (i: Investment) => {
    setState(prev => ({
      ...prev,
      investments: prev.investments.map(inv => inv.id === i.id ? i : inv)
    }));
  };

  const setBalanceOffset = (val: number) => {
    setState(prev => ({ ...prev, balanceOffset: val }));
  };

  const toggleDarkMode = () => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  return (
    <FinanceContext.Provider value={{
      ...state,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, updateCategory, deleteCategory,
      addCard, deleteCard,
      addRecurring, deleteRecurring,
      addInstallment, updateInstallment, deleteInstallment,
      payNextInstallment, undoLastInstallment,
      addGoal, updateGoal, deleteGoal,
      addInvestment, updateInvestment,
      setBalanceOffset, toggleDarkMode
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};