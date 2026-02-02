import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AppState, Transaction, Category, CreditCard, RecurringExpense, FinancialGoal, Investment, InstallmentPurchase
} from '../types';
import { checkRecurringExpenses, checkInstallments, getMonthKey, generateUUID } from '../services/financeUtils';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

interface FinanceContextType extends AppState {
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  addCard: (c: Omit<CreditCard, 'id'>) => void;
  updateCard: (c: CreditCard) => void;
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

  // Initial empty state
  const [state, setState] = useState<AppState>({
    balanceOffset: 0,
    transactions: [],
    categories: [],
    cards: [],
    recurringExpenses: [],
    installments: [],
    goals: [],
    investments: [],
    darkMode: false
  });

  // Load state from Supabase when User changes
  useEffect(() => {
    if (user) {
      api.fetchInitialState(user.id).then(loaded => {
        setState(loaded);
        if (loaded.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      });
    } else {
      // Reset if no user
      setState({
        balanceOffset: 0,
        transactions: [],
        categories: [],
        cards: [],
        recurringExpenses: [],
        installments: [],
        goals: [],
        investments: [],
        darkMode: false
      });
    }
  }, [user]);

  // Handle Dark Mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

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
        // Note: We don't save 'lastGeneratedMonth' to DB explicitly in this simplified version
        // unless we map it. Typically recurring generation is client-side automation.
        // Ideally, we should trust the generated transactions in DB.
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurringExpenses, user]);

  // Installments Checker Effect
  useEffect(() => {
    if (!user) return;
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

  // --- Transactions ---

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const newTx = { ...t, id: generateUUID() };

    setState(prev => {
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

    api.apiAddTransaction(newTx, user.id).catch(console.error);

    // Update Goal in DB if needed
    if (t.goalId && t.type === 'income') {
      const goal = state.goals.find(g => g.id === t.goalId);
      if (goal) {
        api.apiUpdateGoal({ ...goal, currentAmount: goal.currentAmount + t.amount }).catch(console.error);
      }
    }
  };

  const updateTransaction = (t: Transaction) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx => tx.id === t.id ? t : tx)
    }));
    api.apiUpdateTransaction(t, user.id).catch(console.error);
  };

  const deleteTransaction = (id: string) => {
    if (!user) return;
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      let newGoals = prev.goals;
      if (tx && tx.goalId && tx.type === 'income') {
        newGoals = prev.goals.map(g =>
          g.id === tx.goalId ? { ...g, currentAmount: g.currentAmount - tx.amount } : g
        );
        // DB Update Reversed
        const goal = newGoals.find(g => g.id === tx.goalId);
        if (goal) api.apiUpdateGoal(goal).catch(console.error);
      }
      return {
        ...prev,
        transactions: prev.transactions.filter(tx => tx.id !== id),
        goals: newGoals
      };
    });
    api.apiDeleteTransaction(id).catch(console.error);
  };

  // --- Categories ---

  const addCategory = (c: Omit<Category, 'id'>) => {
    if (!user) return;
    const newCat = { ...c, id: generateUUID() };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
    api.apiAddCategory(newCat, user.id).catch(console.error);
  };

  const updateCategory = (c: Category) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat => cat.id === c.id ? c : cat)
    }));
    api.apiUpdateCategory(c).catch(console.error);
  };

  const deleteCategory = (id: string) => {
    if (!user) return;
    if (state.transactions.some(t => t.categoryId === id) || state.recurringExpenses.some(r => r.categoryId === id)) {
      console.warn('Cannot delete category in use');
      return;
    }
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
    api.apiDeleteCategory(id).catch(console.error);
  };

  // --- Cards ---

  const addCard = (c: Omit<CreditCard, 'id'>) => {
    if (!user) return;
    const newCard = { ...c, id: generateUUID() };
    setState(prev => ({
      ...prev,
      cards: [...prev.cards, newCard]
    }));
    api.apiAddCard(newCard, user.id).catch(console.error);
  };

  const deleteCard = (id: string) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== id),
      transactions: prev.transactions.map(t => t.cardId === id ? { ...t, cardId: undefined } : t)
    }));
    api.apiDeleteCard(id).catch(console.error);
  };

  const updateCard = (c: CreditCard) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => card.id === c.id ? c : card)
    }));
    api.apiUpdateCard(c).catch(console.error);
  };

  // --- Recurring ---

  const addRecurring = (r: Omit<RecurringExpense, 'id' | 'lastGeneratedMonth'>) => {
    if (!user) return;
    const newRec = {
      ...r,
      id: generateUUID(),
      lastGeneratedMonth: ''
    };
    setState(prev => ({
      ...prev,
      recurringExpenses: [...prev.recurringExpenses, newRec]
    }));
    api.apiAddRecurring(newRec, user.id).catch(console.error);
  };

  const deleteRecurring = (id: string) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.filter(r => r.id !== id)
    }));
    api.apiDeleteRecurring(id).catch(console.error);
  };

  // --- Installments ---

  const addInstallment = (i: Omit<InstallmentPurchase, 'id' | 'lastGeneratedMonth' | 'status'>) => {
    if (!user) return;
    const newInst: InstallmentPurchase = {
      ...i,
      id: generateUUID(),
      status: 'active',
      lastGeneratedMonth: ''
    };
    setState(prev => ({
      ...prev,
      installments: [...prev.installments, newInst]
    }));
    api.apiAddInstallment(newInst, user.id).catch(console.error);
  };

  const updateInstallment = (i: InstallmentPurchase) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      installments: prev.installments.map(inst => inst.id === i.id ? i : inst)
    }));
    if (i.status === 'completed' || i.status === 'cancelled') {
      api.apiUpdateInstallmentStatus(i.id, i.status).catch(console.error);
    }
  };

  const deleteInstallment = (id: string, deleteTransactions: boolean) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      installments: prev.installments.filter(i => i.id !== id),
      transactions: deleteTransactions
        ? prev.transactions.filter(t => t.installmentId !== id)
        : prev.transactions.map(t => t.installmentId === id ? { ...t, installmentId: undefined } : t)
    }));
    api.apiDeleteInstallment(id).catch(console.error);
    if (deleteTransactions) {
      state.transactions.filter(t => t.installmentId === id).forEach(t => {
        api.apiDeleteTransaction(t.id).catch(console.error);
      });
    }
  };

  const payNextInstallment = (id: string) => {
    setState(prev => {
      const inst = prev.installments.find(i => i.id === id);
      if (!inst) return prev;

      const paidCount = prev.transactions.filter(t => t.installmentId === id).length;
      if (paidCount >= inst.totalInstallments) return prev;

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

      if (user) {
        api.apiAddTransaction(newTx, user.id).catch(console.error);
        if (newStatus !== inst.status) {
          api.apiUpdateInstallmentStatus(inst.id, newStatus).catch(console.error);
        }
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        installments: prev.installments.map(i => i.id === id ? {
          ...i,
          status: newStatus,
          lastGeneratedMonth: currentMonthKey
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

      if (user) {
        api.apiDeleteTransaction(lastTx.id).catch(console.error);
        if (inst.status === 'completed') {
          api.apiUpdateInstallmentStatus(inst.id, 'active').catch(console.error);
        }
      }

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== lastTx.id),
        installments: prev.installments.map(i => i.id === id ? { ...i, status: 'active' } : i)
      };
    });
  };

  // --- Goals ---

  const addGoal = (g: Omit<FinancialGoal, 'id'>) => {
    if (!user) return;
    const newGoal = { ...g, id: generateUUID() };
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
    api.apiAddGoal(newGoal, user.id).catch(console.error);
  };

  const updateGoal = (g: FinancialGoal) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(goal => goal.id === g.id ? g : goal)
    }));
    api.apiUpdateGoal(g).catch(console.error);
  };

  const deleteGoal = (id: string) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
    api.apiDeleteGoal(id).catch(console.error);
  };

  // --- Investments ---

  const addInvestment = (i: Omit<Investment, 'id'>) => {
    if (!user) return;
    const newInv = { ...i, id: generateUUID() };
    setState(prev => ({
      ...prev,
      investments: [...prev.investments, newInv]
    }));
    api.apiAddInvestment(newInv, user.id).catch(console.error);
  };

  const updateInvestment = (i: Investment) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      investments: prev.investments.map(inv => inv.id === i.id ? i : inv)
    }));
    api.apiUpdateInvestment(i).catch(console.error);
  };

  // --- Settings ---

  const setBalanceOffset = (val: number) => {
    if (!user) return;
    setState(prev => ({ ...prev, balanceOffset: val }));
    api.apiUpdateBalance(val, user.id).catch(console.error);
  };

  const toggleDarkMode = () => {
    if (!user) {
      setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
      return;
    }
    setState(prev => {
      const newVal = !prev.darkMode;
      api.apiUpdateTheme(newVal, user.id).catch(console.error);
      return { ...prev, darkMode: newVal };
    });
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