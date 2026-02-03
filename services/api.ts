
import { supabase } from './supabaseClient';
import {
    AppState, Transaction, Category, CreditCard, RecurringExpense,
    InstallmentPurchase, FinancialGoal, Investment, DEFAULT_CATEGORIES
} from '../types';

// --- Mappers (DB <-> App) ---

const mapTransactionFromDB = (t: any): Transaction => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
    categoryId: t.category_id,
    cardId: t.card_id || undefined,
    goalId: t.goal_id || undefined,
    installmentId: t.installment_purchase_id || undefined,
    recurringExpenseId: t.fixed_expense_id || undefined,
    isRecurring: !!t.fixed_expense_id
});

const mapTransactionToDB = (t: Transaction, userId: string) => ({
    id: t.id,
    user_id: userId,
    description: t.description,
    amount: t.amount,
    type: t.type,
    date: t.date,
    category_id: t.categoryId,
    card_id: t.cardId || null,
    goal_id: t.goalId || null,
    installment_purchase_id: t.installmentId || null,
    fixed_expense_id: t.recurringExpenseId || null
});

const mapCategoryFromDB = (c: any): Category => ({
    id: c.id,
    name: c.name,
    color: c.color || '#6366f1'
});

const mapCardFromDB = (c: any): CreditCard => ({
    id: c.id,
    name: c.name,
    limit: Number(c.credit_limit),
    closingDay: c.closing_day,
    dueDay: c.due_day,
    manualInvoiceValue: c.manual_invoice_value ? Number(c.manual_invoice_value) : undefined
});

const mapRecurringFromDB = (r: any): RecurringExpense => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    categoryId: r.category_id,
    dueDay: r.due_day,
    active: r.active,
    lastGeneratedMonth: '' // Calculated at runtime usually
});

const mapGoalFromDB = (g: any): FinancialGoal => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.allocated_amount), // In our schema we called it allocated_amount
    status: g.status === 'completed' ? 'completed' : 'active'
});

const mapInvestmentFromDB = (i: any): Investment => ({
    id: i.id,
    name: i.name,
    type: i.investment_type,
    initialAmount: Number(i.invested_amount), // Schema uses invested_amount
    currentAmount: Number(i.invested_amount), // Simplification: current = initial for now unless updated
    startDate: i.start_date,
    categoryId: i.category_id
});

const mapInstallmentFromDB = (i: any): InstallmentPurchase => ({
    id: i.id,
    description: i.description,
    categoryId: i.category_id,
    cardId: i.card_id,
    totalInstallments: i.total_installments,
    installmentAmount: Number(i.installment_amount),
    totalAmount: Number(i.total_installments) * Number(i.installment_amount), // Derived
    purchaseDate: i.purchase_date,
    dueDay: i.due_day,
    status: i.status === 'completed' ? 'completed' : (i.status === 'cancelled' ? 'cancelled' : 'active'),
    lastGeneratedMonth: '',
});


// --- API Functions ---

export const fetchInitialState = async (userId: string): Promise<AppState> => {
    const state: AppState = {
        balanceOffset: 0,
        transactions: [],
        categories: [],
        cards: [],
        recurringExpenses: [],
        installments: [],
        goals: [],
        investments: [],
        darkMode: false
    };

    // Parallel fetching for performance
    const [
        settingsRes, catRes, cardRes, txRes,
        recRes, goalRes, invRes, instRes
    ] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('cards').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('fixed_expenses').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('installment_purchases').select('*').eq('user_id', userId)
    ]);

    // Apply Data
    if (settingsRes.data) {
        state.balanceOffset = Number(settingsRes.data.cash_balance);
        state.darkMode = settingsRes.data.theme === 'dark';
    }

    if (catRes.data && catRes.data.length > 0) {
        state.categories = catRes.data.map(mapCategoryFromDB);
    } else {
        // If no categories (new user), we might want to seed default ones.
        // For now, we return empty or handled in Context initialization
        // Better: Context creates defaults if empty.
    }

    if (cardRes.data) state.cards = cardRes.data.map(mapCardFromDB);
    if (txRes.data) state.transactions = txRes.data.map(mapTransactionFromDB);
    if (recRes.data) state.recurringExpenses = recRes.data.map(mapRecurringFromDB);
    if (goalRes.data) state.goals = goalRes.data.map(mapGoalFromDB);
    if (invRes.data) state.investments = invRes.data.map(mapInvestmentFromDB);
    if (instRes.data) state.installments = instRes.data.map(mapInstallmentFromDB);

    return state;
};

// --- Transactions ---

export const apiAddTransaction = async (t: Transaction, userId: string) => {
    const payload = mapTransactionToDB(t, userId);
    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) throw error;
};

export const apiUpdateTransaction = async (t: Transaction, userId: string) => {
    const payload = mapTransactionToDB(t, userId);
    const { error } = await supabase.from('transactions').update(payload).eq('id', t.id);
    if (error) throw error;
};

export const apiDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
};

// --- Categories ---

export const apiAddCategory = async (c: Category, userId: string) => {
    const { error } = await supabase.from('categories').insert([{
        id: c.id,
        user_id: userId,
        name: c.name,
        color: c.color
    }]);
    if (error) throw error;
};

export const apiUpdateCategory = async (c: Category) => {
    const { error } = await supabase.from('categories').update({ name: c.name, color: c.color }).eq('id', c.id);
    if (error) throw error;
};

export const apiDeleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

// --- Cards ---

export const apiAddCard = async (c: CreditCard, userId: string) => {
    const { error } = await supabase.from('cards').insert([{
        id: c.id,
        user_id: userId,
        name: c.name,
        credit_limit: c.limit,
        closing_day: c.closingDay,
        due_day: c.dueDay,
        manual_invoice_value: c.manualInvoiceValue || null
    }]);
    if (error) throw error;
};

export const apiDeleteCard = async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw error;
};

export const apiUpdateCard = async (c: CreditCard) => {
    const { error } = await supabase.from('cards').update({
        name: c.name,
        credit_limit: c.limit,
        closing_day: c.closingDay,
        due_day: c.dueDay,
        manual_invoice_value: c.manualInvoiceValue === undefined ? null : c.manualInvoiceValue
    }).eq('id', c.id);
    if (error) throw error;
};

// --- Recurring ---

export const apiAddRecurring = async (r: RecurringExpense, userId: string) => {
    const { error } = await supabase.from('fixed_expenses').insert([{
        id: r.id,
        user_id: userId,
        name: r.name,
        amount: r.amount,
        category_id: r.categoryId,
        due_day: r.dueDay,
        active: r.active
    }]);
    if (error) throw error;
};

export const apiDeleteRecurring = async (id: string) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
};

// --- Goals ---

export const apiAddGoal = async (g: FinancialGoal, userId: string) => {
    const { error } = await supabase.from('goals').insert([{
        id: g.id,
        user_id: userId,
        name: g.name,
        target_amount: g.targetAmount,
        allocated_amount: g.currentAmount,
        status: g.status
    }]);
    if (error) throw error;
};

export const apiUpdateGoal = async (g: FinancialGoal) => {
    const { error } = await supabase.from('goals').update({
        name: g.name,
        target_amount: g.targetAmount,
        allocated_amount: g.currentAmount,
        status: g.status
    }).eq('id', g.id);
    if (error) throw error;
};

export const apiDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
};

// --- Investments ---

export const apiAddInvestment = async (i: Investment, userId: string) => {
    const { error } = await supabase.from('investments').insert([{
        id: i.id,
        user_id: userId,
        name: i.name,
        investment_type: i.type,
        invested_amount: i.initialAmount,
        start_date: i.startDate,
        category_id: i.categoryId
    }]);
    if (error) throw error;
};

export const apiUpdateInvestment = async (i: Investment) => {
    const { error } = await supabase.from('investments').update({
        name: i.name,
        invested_amount: i.currentAmount // Assuming update updates total invested
    }).eq('id', i.id);
    if (error) throw error;
};

// --- Installments ---

export const apiAddInstallment = async (i: InstallmentPurchase, userId: string) => {
    const { error } = await supabase.from('installment_purchases').insert([{
        id: i.id,
        user_id: userId,
        description: i.description,
        category_id: i.categoryId,
        card_id: i.cardId,
        total_installments: i.totalInstallments,
        installment_amount: i.installmentAmount,
        purchase_date: i.purchaseDate,
        due_day: i.dueDay,
        status: i.status
    }]);
    if (error) throw error;
};

export const apiUpdateInstallmentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('installment_purchases').update({ status }).eq('id', id);
    if (error) throw error;
};

export const apiDeleteInstallment = async (id: string) => {
    const { error } = await supabase.from('installment_purchases').delete().eq('id', id);
    if (error) throw error;
};

// --- Settings ---

export const apiUpdateBalance = async (val: number, userId: string) => {
    const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        cash_balance: val,
        updated_at: new Date().toISOString()
    });
    if (error) throw error;
};

export const apiUpdateTheme = async (isDark: boolean, userId: string) => {
    const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        theme: isDark ? 'dark' : 'light',
        updated_at: new Date().toISOString()
    });
    if (error) throw error;
};
