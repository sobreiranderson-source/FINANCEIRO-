import { AppState, DEFAULT_CATEGORIES } from '../types';

const STORAGE_KEY_BASE = 'fincontrol_pro_db_v1';


export const INITIAL_STATE: AppState = {
  balanceOffset: 0,
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  cards: [],
  recurringExpenses: [],
  installments: [],
  goals: [],
  investments: [],
  darkMode: false,
};

export const loadState = (userId: string): AppState => {

  try {
    const key = `${STORAGE_KEY_BASE}_${userId}`;
    const serialized = localStorage.getItem(key);

    if (!serialized) return INITIAL_STATE;
    const parsed = JSON.parse(serialized);

    // Ensure default categories exist if loading an old state that might miss them
    // but don't overwrite user changes if they exist. 
    // Since we are adding to defaults, new users get them. 
    // Existing users will get them if we merge, but simplistic merge is risky.
    // We will stick to the basic load logic but ensure Types match.
    return { ...INITIAL_STATE, ...parsed };
  } catch (err) {
    console.error('Failed to load state', err);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState, userId: string): void => {

  try {
    const key = `${STORAGE_KEY_BASE}_${userId}`;
    localStorage.setItem(key, JSON.stringify(state));

  } catch (err) {
    console.error('Failed to save state', err);
  }
};