import React, { useState } from 'react';


import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, UserPlus, AlertTriangle } from 'lucide-react';

const Login = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();


    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegisterMode) {
                const res = await register(email, password, name);
                if (!res.success) { setError(res.error || 'Erro ao cadastrar'); } else { navigate('/'); }
            } else {
                const res = await login(email, password);
                if (!res.success) { setError(res.error || 'Erro ao entrar'); } else { navigate('/'); }
            }
        } catch (err: any) {
            setError('Erro: ' + (err.message || 'Ocorreu um erro inesperado.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card border dark:border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold dark:text-white">Clareza Finance</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isRegisterMode ? 'Definir Senha / Cadastro' : 'Acesse sua conta'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pl-10 w-full border rounded-lg p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    {isRegisterMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                            <div className="relative">
                                <UserPlus className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="pl-10 w-full border rounded-lg p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Seu Nome"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-10 w-full border rounded-lg p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Processando...' : (isRegisterMode ? 'Definir Senha' : 'Entrar')}
                        {!loading && <LogIn className="w-5 h-5" />}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }}
                        className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                    >
                        {isRegisterMode ? 'Já tem senha? Faça Login' : 'Primeiro acesso? Defina sua senha'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
