import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getSession, initAuth, login as authLogin, logout as authLogout, register as authRegister } from '../services/auth';
import { AppState } from '../types';
import { loadState, saveState } from '../services/storage';

interface AuthContextData {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
    login: (email: string, pass: string) => Promise<{ success: boolean, error?: string }>;
    register: (email: string, pass: string, name: string) => Promise<{ success: boolean, error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            await initAuth();
            const session = getSession();
            if (session) {
                // Determine if we need to migrate data
                // Logic: If Admin is logging in and no data exists for them, BUT
                // legacy data exists, we migrate it.
                // Doing this safely requires checking if legacy key exists.
                // For now, we trust the `loadState` in FinanceContext to handle "empty" state.
                // The actual migration logic is tricky without explicit user consent.
                // We will just load the session.
                setUser(session);
            }
            setLoading(false);
        };
        load();
    }, []);

    const login = async (email: string, pass: string) => {
        const res = await authLogin(email, pass);
        if (res.success && res.user) {
            setUser(res.user);

            // Check for Legacy Migration Opportunity
            // If this is the FIRST Admin login ever (or at least we want to claim legacy data)
            // We can check if `fincontrol_pro_db_v1` exists and `fincontrol_pro_db_v1_USERID` does not.
            const legacyKey = 'fincontrol_pro_db_v1';
            const newKey = `fincontrol_pro_db_v1_${res.user.id}`;
            const hasLegacy = !!localStorage.getItem(legacyKey);
            const hasNew = !!localStorage.getItem(newKey);

            if (hasLegacy && !hasNew && res.user.role === 'ADMIN') {
                // Clone data
                const legacyData = localStorage.getItem(legacyKey);
                if (legacyData) {
                    localStorage.setItem(newKey, legacyData);
                    // Optional: Rename legacy to backup to prevent double claim?
                    // localStorage.setItem(legacyKey + '_backup', legacyData);
                    // localStorage.removeItem(legacyKey);
                    // For safety, we KEEP legacy data there, so multiple admins *could* claim it 
                    // or it stays as a backup.
                }
            }
        }
        return res;
    };

    const register = async (email: string, pass: string, name: string) => {
        const res = await authRegister(email, pass, name);
        if (res.success) {
            // After register, we are auto logged in, update state
            const session = getSession();
            setUser(session);
        }
        return res;
    };

    const logout = () => {
        authLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'ADMIN',
            loading,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
