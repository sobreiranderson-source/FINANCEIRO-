import React, { useState, useEffect } from 'react';
import { getManageableUsers, addToAllowlist, toggleUserStatus, updateUserRole } from '../services/auth';
import { User, AllowlistEntry, UserRole } from '../types';
import { Shield, User as UserIcon, Check, X, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [refresh, setRefresh] = useState(0);

    // Form
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('USER');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const data = getManageableUsers();
        setUsers(data.users);
        setAllowlist(data.allowlist);
    }, [refresh]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            addToAllowlist(newEmail, newRole);
            setSuccess('E-mail adicionado à lista de permissão.');
            setNewEmail('');
            setRefresh(prev => prev + 1);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleToggleStatus = (email: string) => {
        if (email === currentUser?.email) {
            alert('Você não pode desativar seu próprio usuário.');
            return;
        }
        if (confirm('Tem certeza que deseja alterar o status deste usuário?')) {
            toggleUserStatus(email);
            setRefresh(prev => prev + 1);
        }
    };

    const handleRoleChange = (email: string, currentRole: UserRole) => {
        if (email === currentUser?.email) return;

        const newR = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        if (confirm(`Alterar perfil para ${newR}?`)) {
            updateUserRole(email, newR);
            setRefresh(prev => prev + 1);
        }
    };

    // Merge lists to show complete status
    // Use allowlist as base since it contains everyone permitted
    const mergedList = allowlist.map(entry => {
        const registeredUser = users.find(u => u.email === entry.email);
        return {
            ...entry,
            isRegistered: !!registeredUser,
            lastAccess: registeredUser?.lastAccess,
            currentStatus: registeredUser ? registeredUser.status : entry.status, // User status takes precedence
            currentRole: registeredUser ? registeredUser.role : entry.role
        };
    });

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-2xl font-bold dark:text-white">Painel do Administrador</h2>
                </div>

                {/* Add User */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border dark:border-gray-700 mb-8">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Autorizar Novo Acesso</h3>
                    <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm mb-1 dark:text-gray-300">E-mail</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                required
                                placeholder="usuario@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 dark:text-gray-300">Perfil</label>
                            <select
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as UserRole)}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="USER">Usuário</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                            Adicionar à Lista
                        </button>
                    </form>
                    {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                    {success && <p className="text-emerald-500 mt-2 text-sm">{success}</p>}
                </div>

                {/* Users List */}
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Usuários Gerenciados</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th className="p-3 rounded-tl-lg">E-mail</th>
                                <th className="p-3">Perfil</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Cadastro</th>
                                <th className="p-3 rounded-tr-lg">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {mergedList.map(item => (
                                <tr key={item.email} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-3">
                                        <div className="font-medium dark:text-white">{item.email}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.isRegistered ? `Último acesso: ${new Date(item.lastAccess!).toLocaleDateString()}` : 'Pendente de cadastro'}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.currentRole === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {item.currentRole}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`flex items-center gap-1.5 ${item.currentStatus === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${item.currentStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            {item.currentStatus === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b-0 dark:text-gray-300">
                                        {item.isRegistered ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-orange-500 text-xs">Aguardando</span>}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button
                                                title={item.currentStatus === 'active' ? 'Desativar' : 'Ativar'}
                                                onClick={() => handleToggleStatus(item.email)}
                                                className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${item.currentStatus === 'active' ? 'text-red-500' : 'text-emerald-500'}`}
                                            >
                                                {item.currentStatus === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                            </button>

                                            <button
                                                title="Alterar Perfil (Admin/User)"
                                                onClick={() => handleRoleChange(item.email, item.currentRole)}
                                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-indigo-500"
                                            >
                                                <Shield className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
