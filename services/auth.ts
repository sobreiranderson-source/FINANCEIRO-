import { User, UserRole, AllowlistEntry } from '../types';
import { generateUUID } from './financeUtils';

const USERS_KEY = 'fincontrol_users_v1';
const ALLOWLIST_KEY = 'fincontrol_allowlist_v1';
const SESSION_KEY = 'fincontrol_session_v1';

// Seed Admin Credentials - In a real app this would be ENV or DB
const INITIAL_ADMIN = {
    email: 'jotajoao29@gmail.com',
    password: 'gg8754070302'
};

// --- Helpers ---

// Simple SHA-256 hash using Web Crypto API with Fallback
export const hashPassword = async (password: string): Promise<string> => {
    try {
        if (!crypto || !crypto.subtle) throw new Error('Crypto API not available');
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        // Fallback for non-secure contexts (http) or incompatible browsers
        console.warn('Using fallback hashing (insecure) due to:', e);
        // Simple string hash (DJB2 variant)
        let hash = 5381;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) + hash) + password.charCodeAt(i);
        }
        return (hash >>> 0).toString(16);
    }
};

const getUsers = (): User[] => {
    const str = localStorage.getItem(USERS_KEY);
    return str ? JSON.parse(str) : [];
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const getAllowlist = (): AllowlistEntry[] => {
    const str = localStorage.getItem(ALLOWLIST_KEY);
    return str ? JSON.parse(str) : [];
};

const saveAllowlist = (list: AllowlistEntry[]) => {
    localStorage.setItem(ALLOWLIST_KEY, JSON.stringify(list));
};

// --- Public API ---

export const initAuth = async () => {
    // Ensure Initial Admin Exists
    const users = getUsers();
    const allowlist = getAllowlist();

    // Check if admin exists in allowlist
    let adminAllowed = allowlist.find(e => e.email === INITIAL_ADMIN.email);
    if (!adminAllowed) {
        adminAllowed = {
            email: INITIAL_ADMIN.email,
            role: 'ADMIN',
            status: 'active',
            createdAt: new Date().toISOString()
        };
        allowlist.push(adminAllowed);
        saveAllowlist(allowlist);
    }

    // Check if admin user exists and valid
    // We FORCE update the admin password hash to match current algorithm
    const adminUser = users.find(u => u.email === INITIAL_ADMIN.email);
    const expectedHash = await hashPassword(INITIAL_ADMIN.password);

    if (!adminUser) {
        const newAdmin: User = {
            id: generateUUID(),
            email: INITIAL_ADMIN.email,
            name: 'Administrador',
            role: 'ADMIN',
            status: 'active',
            passwordHash: expectedHash,
            createdAt: new Date().toISOString()
        };
        users.push(newAdmin);
        saveUsers(users);
    } else if (adminUser.passwordHash !== expectedHash) {
        // Update hash if algorithm changed
        adminUser.passwordHash = expectedHash;
        saveUsers(users);
    }
};

export const login = async (email: string, password: string): Promise<{ success: boolean, user?: User, error?: string }> => {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        // Check if in allowlist to give better error
        const allowlist = getAllowlist();
        const allowed = allowlist.find(e => e.email.toLowerCase() === email.toLowerCase());
        if (allowed) {
            return { success: false, error: 'Usuário autorizado mas não cadastrado. Defina sua senha.' };
        }
        return { success: false, error: 'Usuário não encontrado ou não autorizado.' };
    }

    if (user.status !== 'active') {
        return { success: false, error: 'Prezado usuário, seu acesso está desativado.' };
    }

    const hash = await hashPassword(password);
    if (user.passwordHash !== hash) {
        return { success: false, error: 'Credenciais inválidas.' };
    }

    // Update Last Access
    user.lastAccess = new Date().toISOString();
    saveUsers(users.map(u => u.id === user.id ? user : u));

    // Persist Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));

    return { success: true, user };
};

export const register = async (email: string, password: string, name: string): Promise<{ success: boolean, error?: string }> => {
    const allowlist = getAllowlist();
    const allowed = allowlist.find(e => e.email.toLowerCase() === email.toLowerCase());

    if (!allowed) {
        return { success: false, error: 'E-mail não autorizado pelo administrador.' };
    }

    if (allowed.status !== 'active') {
        return { success: false, error: 'Acesso não autorizado. Solicite liberação ao administrador.' };
    }

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Usuário já cadastrado.' };
    }

    const hash = await hashPassword(password);
    const newUser: User = {
        id: generateUUID(),
        email: allowed.email, // Use exact casing from allowlist or normalize?
        name: name,
        role: allowed.role,
        status: allowed.status,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // Auto login
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

    return { success: true };
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): User | null => {
    const str = localStorage.getItem(SESSION_KEY);
    return str ? JSON.parse(str) : null;
};

// --- Admin Functions ---

export const getManageableUsers = (): { users: User[], allowlist: AllowlistEntry[] } => {
    return {
        users: getUsers(),
        allowlist: getAllowlist()
    };
};

export const addToAllowlist = (email: string, role: UserRole) => {
    const list = getAllowlist();
    if (list.find(e => e.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('E-mail já está na lista.');
    }
    list.push({
        email,
        role,
        status: 'active',
        createdAt: new Date().toISOString()
    });
    saveAllowlist(list);
};

export const toggleUserStatus = (email: string) => {
    const list = getAllowlist();
    const entry = list.find(e => e.email === email);
    if (entry) {
        entry.status = entry.status === 'active' ? 'inactive' : 'active';
        saveAllowlist(list);
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        saveUsers(users);
    }
};

export const updateUserRole = (email: string, role: UserRole) => {
    const list = getAllowlist();
    const entry = list.find(e => e.email === email);
    if (entry) {
        entry.role = role;
        saveAllowlist(list);
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.role = role;
        saveUsers(users);
    }
}
