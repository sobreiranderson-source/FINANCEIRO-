import { supabase } from './supabaseClient';
import { User } from '../types';

export const login = async (email: string, password: string): Promise<{ success: boolean, user?: User, error?: string }> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, error: 'Credenciais inválidas ou erro no login.' };
        }

        if (data.user) {
            // Need to fetch extra profile info if needed, but for now converting authUser to our User type
            // Checking status in profiles table which we created in SQL
            // But since RLS enforces security, we can just rely on Auth for now or fetch profile

            // Let's fetch profile to check status and role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) {
                // Fallback if profile trigger failed or first run latency (though trigger is sync)
                // But wait, if trigger blocked unauthorized user, they wouldn't have an account or profile?
                // Actually the Auth signup might succeed but profile creation fail if we didn't block it.
                // BUT we are using "Allow User Signup" OFF or Trigger block.

                // If profiles table exists and RLS works, we should get data.
                // For now, let's assume if login works, they are active unless we check profile.
                // The SQL trigger `handle_new_user` handles signup rejection.
                // If we need to check "inactive" AFTER signup (e.g. admin deactivated them), we check profile.
            }

            if (profile && profile.status !== 'active') {
                await supabase.auth.signOut();
                return { success: false, error: 'Usuário desativado.' };
            }

            const appUser: User = {
                id: data.user.id,
                email: data.user.email || '',
                name: profile?.name || data.user.user_metadata?.name || 'Usuário',
                role: profile?.role || 'user',
                status: profile?.status || 'active',
                createdAt: data.user.created_at,
                // passwordHash not exposed
            };

            return { success: true, user: appUser };
        }
        return { success: false, error: 'Usuário não encontrado.' };
    } catch (e) {
        return { success: false, error: 'Erro inesperado.' };
    }
};

export const register = async (email: string, password: string, name: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name
                }
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // If 'Allow new users to sign up' is blocked in Supabase UI, this returns error.
        // If it is open but our trigger `handle_new_user` raises exception, it SHOULD return error.
        // But Supabase Auth sometimes creates the Auth User even if the Trigger on `public.profiles` fails, 
        // UNLESS the trigger is on `auth.users`. 
        // We set the trigger on `auth.users` in the schema provided. 
        // Postgres triggers on auth.users CAN abort the transaction if they raise exception.

        if (data.user) {
            // Check if user has an identity (sometimes confirm email is needed)
            if (data.user.identities && data.user.identities.length === 0) {
                return { success: false, error: 'E-mail já cadastrado ou erro na validação.' };
            }
            return { success: true };
        }

        return { success: false, error: 'Erro ao cadastrar.' };
    } catch (e) {
        return { success: false, error: 'Erro inesperado.' };
    }
};

export const logout = async () => {
    await supabase.auth.signOut();
};

export const getSession = async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        // Optionally fetch profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        return {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || session.user.user_metadata?.name || '',
            role: profile?.role || 'user',
            status: profile?.status || 'active',
            createdAt: session.user.created_at
        };
    }
    return null;
};

// Admin Helpers (These usually require Admin API or RLS policies allowing admin)
// Since we are client-side, we depend on RLS.
export const getManageableUsers = async () => {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    const { data: allowlist } = await supabase.from('allowed_emails').select('*');

    // Convert to expected format
    return {
        users: profiles || [],
        allowlist: allowlist || []
    };
};

export const addToAllowlist = async (email: string, role: string) => {
    // Client-side call: Will only work if RLS allows this user (Admin) to INSERT into allowed_emails
    const { error } = await supabase
        .from('allowed_emails')
        .insert([{ email, role_preferred: role.toLowerCase(), status: 'active' }]);

    if (error) throw new Error(error.message);
};

export const toggleUserStatus = async (email: string) => {
    // We need to update allowed_emails AND profiles (if exists)
    // Fetch allowed first
    const { data: allowed } = await supabase.from('allowed_emails').select('status').eq('email', email).single();
    if (allowed) {
        const newStatus = allowed.status === 'active' ? 'inactive' : 'active';
        await supabase.from('allowed_emails').update({ status: newStatus }).eq('email', email);
    }

    const { data: profile } = await supabase.from('profiles').select('status').eq('email', email).single();
    if (profile) {
        const newStatus = profile.status === 'active' ? 'inactive' : 'active';
        await supabase.from('profiles').update({ status: newStatus }).eq('email', email);
    }
};

export const updateUserRole = async (email: string, role: string) => {
    await supabase.from('allowed_emails').update({ role_preferred: role }).eq('email', email);
    await supabase.from('profiles').update({ role }).eq('email', email);
};

// Deprecated or Dummy for compatibility if needed
export const initAuth = async () => {
    // In Supabase, init is handled by the client. 
    // We could check if admin exists in allowlist here if we wanted to be robust, 
    // but the SQL migration handled the initial seed.
};

// Compat for `hashPassword` if still imported somewhere
export const hashPassword = async (p: string) => p;

export const updatePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {
    try {
        // 1. Verify old password by trying to re-authenticate
        // Note: Supabase doesn't have a direct "re-auth" method that doesn't change session, 
        // but we can try signIn. If sucessful, we proceed.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return { success: false, error: 'Usuário não autenticado.' };

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (signInError) {
            return { success: false, error: 'Senha atual incorreta.' };
        }

        // 2. Update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: 'Erro inesperado ao atualizar senha.' };
    }
}; 
