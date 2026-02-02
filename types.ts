export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO date string YYYY-MM-DD
  categoryId: string;
  cardId?: string; // If linked to credit card
  goalId?: string; // If linked to an objective (income/contribution)
  installmentId?: string; // Link to the parent installment plan
  isRecurring?: boolean;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dueDay: number;
  lastGeneratedMonth: string; // YYYY-MM format to prevent dupes
  active: boolean;
}

export interface InstallmentPurchase {
  id: string;
  description: string;
  categoryId: string;
  cardId?: string;
  totalInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  purchaseDate: string;
  dueDay: number;
  status: 'active' | 'completed' | 'cancelled';
  lastGeneratedMonth: string; // Control to prevent monthly duplication
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // Manually editable
  deadline?: string;
  status: 'active' | 'completed';
}

export interface Investment {
  id: string;
  name: string;
  type: string; // Stock, Bond, Crypto, etc.
  initialAmount: number;
  currentAmount: number;
  startDate: string;
  categoryId: string;
}

export interface AppState {
  balanceOffset: number; // User editable "starting balance"
  transactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
  recurringExpenses: RecurringExpense[];
  installments: InstallmentPurchase[]; // New module
  goals: FinancialGoal[];
  investments: Investment[];
  darkMode: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Alimentação', color: '#10b981' }, // Emerald
  { id: 'cat_2', name: 'Moradia', color: '#f59e0b' }, // Amber
  { id: 'cat_3', name: 'Transporte', color: '#3b82f6' }, // Blue
  { id: 'cat_4', name: 'Saúde', color: '#ef4444' }, // Red
  { id: 'cat_5', name: 'Lazer', color: '#8b5cf6' }, // Violet
  { id: 'cat_6', name: 'Educação', color: '#ec4899' }, // Pink
  { id: 'cat_7', name: 'Investimentos', color: '#6366f1' }, // Indigo
  { id: 'cat_8', name: 'Salário', color: '#14b8a6' }, // Teal
  { id: 'cat_9', name: 'Telefonia', color: '#0ea5e9' }, // Sky
  { id: 'cat_10', name: 'Manutenções da casa', color: '#f97316' }, // Orange
];

// --- AUTH TYPES ---

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string; // Optional because allowlist entries might not have it yet
  createdAt: string;
  lastAccess?: string;
}

export interface AllowlistEntry {
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}