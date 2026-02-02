import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutDashboard, CreditCard, Repeat, PieChart, Target, TrendingUp, Settings, FileText, Menu, X, Moon, Sun, Tag, Edit, Trash2, Layers, Shield, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Investments from './components/Investments';
import Installments from './components/Installments';
import Login from './components/Login';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './services/financeUtils';
import { Category } from './types';

// --- Shared Modal ---
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-xl w-full max-w-sm">
                <h3 className="font-bold text-lg mb-2 dark:text-white">Confirmação</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 dark:text-white dark:border-gray-600">Cancelar</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirmar</button>
                </div>
            </div>
        </div>
    )
}

// --- Sub Components ---

const Reports = () => {
    const { transactions } = useFinance();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Relatório Financeiro - ${month}`, 14, 22);

        const filteredTx = transactions.filter(t => t.date.startsWith(month));

        const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

        doc.setFontSize(12);
        doc.text(`Entradas: ${formatCurrency(totalIncome)}`, 14, 32);
        doc.text(`Saídas: ${formatCurrency(totalExpense)}`, 14, 38);
        doc.text(`Saldo: ${formatCurrency(totalIncome - totalExpense)}`, 14, 44);

        const tableData = filteredTx.map(t => [
            formatDate(t.date),
            t.description,
            t.type === 'income' ? 'Entrada' : 'Saída',
            formatCurrency(t.amount)
        ]);

        autoTable(doc, {
            head: [['Data', 'Descrição', 'Tipo', 'Valor']],
            body: tableData,
            startY: 50,
        });

        doc.save(`relatorio-${month}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Relatórios</h2>
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">Período</label>
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="border rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={generatePDF}
                        className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700"
                    >
                        <FileText className="w-4 h-4" /> Baixar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreditCardsManager = () => {
    const { cards, addCard, deleteCard, updateCard, transactions } = useFinance();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');
    const [due, setDue] = useState('10');
    const [closing, setClosing] = useState('3');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    const currentMonth = new Date().toISOString().slice(0, 7);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && editId) {
            updateCard({
                id: editId,
                name,
                limit: parseFloat(limit),
                closingDay: parseInt(closing),
                dueDay: parseInt(due)
            });
            setIsEditing(false);
            setEditId(null);
        } else {
            addCard({
                name,
                limit: parseFloat(limit),
                closingDay: parseInt(closing),
                dueDay: parseInt(due)
            });
        }
        setName(''); setLimit(''); setDue('10'); setClosing('3');
    };

    const startEdit = (c: any) => {
        setName(c.name);
        setLimit(c.limit.toString());
        setDue(c.dueDay.toString());
        setClosing(c.closingDay.toString());
        setIsEditing(true);
        setEditId(c.id);
        setSelectedCardId(null); // Close details if open
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setName(''); setLimit(''); setDue('10'); setClosing('3');
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4 dark:text-white">{isEditing ? 'Editar Cartão' : 'Cartões de Crédito'}</h2>
                <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs dark:text-gray-400 mb-1">Nome</label>
                        <input placeholder="Ex: Nubank" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs dark:text-gray-400 mb-1">Limite</label>
                        <input type="number" placeholder="0.00" value={limit} onChange={e => setLimit(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs dark:text-gray-400 mb-1">Fecha dia</label>
                        <input type="number" placeholder="Dia" value={closing} onChange={e => setClosing(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" required max={31} min={1} />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs dark:text-gray-400 mb-1">Vence dia</label>
                        <input type="number" placeholder="Dia" value={due} onChange={e => setDue(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" required max={31} min={1} />
                    </div>
                    <button className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 h-10">
                        {isEditing ? 'Salvar Alterações' : 'Adicionar Cartão'}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={cancelEdit} className="border px-4 py-2 rounded hover:bg-gray-100 dark:text-white h-10">
                            Cancelar
                        </button>
                    )}
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map(card => {
                        const cardTx = transactions.filter(t => t.cardId === card.id && t.date.startsWith(currentMonth));
                        const used = cardTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                        const available = card.limit - used;
                        const percent = (used / card.limit) * 100;

                        return (
                            <div key={card.id} className="relative group">
                                <div
                                    onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                                    className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer transition transform hover:scale-[1.02]"
                                >
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg">{card.name}</h3>
                                            <CreditCard className="opacity-50" />
                                        </div>
                                        <div className="mt-6">
                                            <p className="text-xs text-gray-300">Fatura Atual (Est.)</p>
                                            <p className="text-2xl font-bold">{formatCurrency(used)}</p>
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs mb-1 text-gray-300">
                                                <span>Disp: {formatCurrency(available)}</span>
                                                <span>Lim: {formatCurrency(card.limit)}</span>
                                            </div>
                                            <div className="w-full bg-white/20 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${percent > 90 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-4 text-xs text-gray-400">
                                            <span>Fecha: Dia {card.closingDay}</span>
                                            <span>Vence: Dia {card.dueDay}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); startEdit(card); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(card.id); }} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40 text-red-300" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Detalhes do Cartão Selecionado */}
            {selectedCardId && (
                <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white">
                            Gastos do Cartão: {cards.find(c => c.id === selectedCardId)?.name}
                        </h3>
                        <button onClick={() => setSelectedCardId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-gray-500">
                                    <th className="pb-2">Data</th>
                                    <th className="pb-2">Descrição</th>
                                    <th className="pb-2">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions
                                    .filter(t => t.cardId === selectedCardId && t.date.startsWith(currentMonth) && t.type === 'expense')
                                    .map(t => (
                                        <tr key={t.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="py-2 dark:text-gray-300">{formatDate(t.date)}</td>
                                            <td className="py-2 dark:text-gray-300">{t.description}</td>
                                            <td className="py-2 font-medium text-red-600 dark:text-red-400">{formatCurrency(t.amount)}</td>
                                        </tr>
                                    ))}
                                {transactions.filter(t => t.cardId === selectedCardId && t.date.startsWith(currentMonth)).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-500">Nenhum gasto neste cartão este mês.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteId}
                message="Excluir este cartão? Histórico será mantido mas desvinculado."
                onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) deleteCard(deleteId); setDeleteId(null); }}
            />
        </div>
    )
}

const RecurringManager = () => {
    const { recurringExpenses, addRecurring, deleteRecurring, categories } = useFinance();
    const [form, setForm] = useState({ name: '', amount: '', dueDay: '5', categoryId: '' });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addRecurring({
            name: form.name,
            amount: parseFloat(form.amount),
            categoryId: form.categoryId,
            dueDay: parseInt(form.dueDay),
            active: true
        });
        setForm({ name: '', amount: '', dueDay: '5', categoryId: '' });
    }

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Gastos Fixos / Recorrentes</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <input placeholder="Nome (ex: Aluguel)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded p-2 dark:bg-gray-800 dark:text-white" required />
                <input type="number" placeholder="Valor" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border rounded p-2 dark:bg-gray-800 dark:text-white" required />
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="border rounded p-2 dark:bg-gray-800 dark:text-white" required>
                    <option value="">Categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="Dia Venc." value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className="border rounded p-2 dark:bg-gray-800 dark:text-white" required max={31} min={1} />
                <button className="bg-indigo-600 text-white rounded hover:bg-indigo-700">Adicionar</button>
            </form>

            <ul className="space-y-2">
                {recurringExpenses.map(r => (
                    <li key={r.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
                        <div>
                            <span className="font-semibold dark:text-white">{r.name}</span>
                            <span className="text-sm text-gray-500 ml-2">Dia {r.dueDay}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(r.amount)}</span>
                            <button onClick={() => setDeleteId(r.id)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                        </div>
                    </li>
                ))}
            </ul>
            <ConfirmModal
                isOpen={!!deleteId}
                message="Parar esta recorrência?"
                onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) deleteRecurring(deleteId); setDeleteId(null); }}
            />
        </div>
    )
}

const CategoriesManager = () => {
    const { categories, addCategory, deleteCategory, updateCategory } = useFinance();
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            const cat = categories.find(c => c.id === editingId);
            if (cat) updateCategory({ ...cat, name, color });
            setEditingId(null);
        } else {
            addCategory({ name, color });
        }
        setName(''); setColor('#6366f1');
    };

    const handleEdit = (c: Category) => {
        setName(c.name);
        setColor(c.color);
        setEditingId(c.id);
    }

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5" /> Gerenciar Categorias
            </h2>
            <form onSubmit={handleAdd} className="flex gap-4 mb-6 flex-wrap">
                <input
                    placeholder="Nome da Categoria"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="border rounded px-3 py-2 flex-1 dark:bg-gray-800 dark:text-white"
                    required
                />
                <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="h-10 w-16 border rounded cursor-pointer"
                    required
                />
                <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                    {editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingId && (
                    <button type="button" onClick={() => { setEditingId(null); setName(''); }} className="border px-4 py-2 rounded dark:text-white">Cancelar</button>
                )}
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                            <span className="font-medium dark:text-white">{c.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(c)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteId(c.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmModal
                isOpen={!!deleteId}
                message="Excluir categoria? (Só será excluída se não estiver em uso)"
                onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) deleteCategory(deleteId); setDeleteId(null); }}
            />
        </div>
    )
}

const GoalsManager = () => {
    const { goals, addGoal, deleteGoal, updateGoal } = useFinance();
    const [form, setForm] = useState({ name: '', target: '' });
    const [editAmountId, setEditAmountId] = useState<string | null>(null);
    const [tempAmount, setTempAmount] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addGoal({
            name: form.name,
            targetAmount: parseFloat(form.target),
            currentAmount: 0,
            status: 'active'
        });
        setForm({ name: '', target: '' });
    }

    const saveAmount = (g: any) => {
        const val = parseFloat(tempAmount);
        if (!isNaN(val)) {
            updateGoal({ ...g, currentAmount: val });
        }
        setEditAmountId(null);
    }

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Objetivos</h2>
            <form onSubmit={handleAdd} className="flex gap-4 mb-6">
                <input placeholder="Objetivo (ex: Viagem)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded p-2 flex-1 dark:bg-gray-800 dark:text-white" required />
                <input type="number" placeholder="Valor Meta" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="border rounded p-2 w-32 dark:bg-gray-800 dark:text-white" required />
                <button className="bg-indigo-600 text-white px-4 rounded hover:bg-indigo-700">Criar</button>
            </form>
            <div className="grid grid-cols-1 gap-4">
                {goals.map(g => {
                    const progress = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                    return (
                        <div key={g.id} className="border dark:border-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1 w-full">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold dark:text-white">{g.name}</span>
                                    {editAmountId === g.id ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                className="w-24 px-1 py-0.5 text-sm border rounded dark:bg-gray-800 dark:text-white"
                                                value={tempAmount}
                                                onChange={e => setTempAmount(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => saveAmount(g)} className="text-xs bg-emerald-500 text-white px-2 py-1 rounded">OK</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">{formatCurrency(g.currentAmount)} de {formatCurrency(g.targetAmount)}</span>
                                            <button
                                                title="Ajustar valor guardado"
                                                onClick={() => { setTempAmount(g.currentAmount.toString()); setEditAmountId(g.id); }}
                                                className="text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1 rounded"
                                            >
                                                <Edit className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div className={`h-2 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <button onClick={() => setDeleteId(g.id)} className="text-red-500 self-end md:self-center"><X className="w-5 h-5" /></button>
                        </div>
                    );
                })}
            </div>
            <ConfirmModal
                isOpen={!!deleteId}
                message="Excluir este objetivo?"
                onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) deleteGoal(deleteId); setDeleteId(null); }}
            />
        </div>
    )
}

// --- Layout ---

const SidebarItem = ({ to, icon: Icon, label, onClick, collapsed }: any) => (
    <NavLink
        to={to}
        onClick={onClick}
        title={collapsed ? label : ''}
        className={({ isActive }) =>
            `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg transition-all duration-200 group relative ${isActive
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`
        }
    >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="whitespace-nowrap overflow-hidden transition-opacity duration-200">{label}</span>}
    </NavLink>
);

const Layout = ({ children }: { children?: React.ReactNode }) => {
    const { darkMode, toggleDarkMode } = useFinance();
    const { user, logout, isAdmin } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Sidebar Persistence
    const getInitialState = () => {
        if (!user) return false;
        try {
            return localStorage.getItem(`fincontrol_sidebar_${user.id}`) === 'true';
        } catch {
            return false;
        }
    };
    const [isCollapsed, setIsCollapsed] = useState(getInitialState);

    React.useEffect(() => {
        if (user) {
            localStorage.setItem(`fincontrol_sidebar_${user.id}`, String(isCollapsed));
        }
    }, [isCollapsed, user]);

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-dark-text overflow-hidden transition-colors duration-200">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}>
                <div className="h-full flex flex-col">
                    <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-gray-100 dark:border-gray-800 transition-all`}>
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden' : 'flex'}`}>
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">CF</div>
                            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Clareza Finance</span>
                        </div>
                        {isCollapsed && <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">CF</div>}

                        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>

                        <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!isCollapsed && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 m-2 rounded-lg mb-0 animate-fadeIn">
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Logado como</p>
                            <p className="font-bold truncate dark:text-gray-200">{user.name || user.email}</p>
                            <p className="text-xs text-gray-500">{isAdmin ? 'Administrador' : 'Usuário'}</p>
                        </div>
                    )}

                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
                        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/transactions" icon={Repeat} label="Movimentações" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/installments" icon={Layers} label="Parcelas" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/categories" icon={Tag} label="Categorias" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/cards" icon={CreditCard} label="Cartões" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/recurring" icon={FileText} label="Gastos Fixos" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/goals" icon={Target} label="Objetivos" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/investments" icon={TrendingUp} label="Investimentos" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/reports" icon={PieChart} label="Relatórios" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                        <SidebarItem to="/profile" icon={User} label="Meus Dados" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />

                        {isAdmin && (
                            <>
                                <div className="border-t my-2 border-gray-100 dark:border-gray-800 pt-2"></div>
                                <SidebarItem to="/admin" icon={Shield} label="Administração" collapsed={isCollapsed} onClick={() => setIsMobileOpen(false)} />
                            </>
                        )}
                    </nav>

                    <div className="p-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <button
                            onClick={toggleDarkMode}
                            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
                            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-4 py-3 w-full rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all`}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {!isCollapsed && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
                        </button>
                        <button
                            onClick={logout}
                            title="Sair"
                            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-4 py-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all`}
                        >
                            <LogOut className="w-5 h-5" />
                            {!isCollapsed && <span>Sair</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <header className="h-16 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
                    <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-gray-600 dark:text-gray-200">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="ml-auto flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className={`max-w-7xl mx-auto transition-all duration-300`}>
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <FinanceProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                            <Layout>
                                <Dashboard />
                            </Layout>
                        } />
                        <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
                        <Route path="/installments" element={<Layout><Installments /></Layout>} />
                        <Route path="/categories" element={<Layout><CategoriesManager /></Layout>} />
                        <Route path="/cards" element={<Layout><CreditCardsManager /></Layout>} />
                        <Route path="/recurring" element={<Layout><RecurringManager /></Layout>} />
                        <Route path="/goals" element={<Layout><GoalsManager /></Layout>} />
                        <Route path="/investments" element={<Layout><Investments /></Layout>} />
                        <Route path="/reports" element={<Layout><Reports /></Layout>} />
                        <Route path="/profile" element={<Layout><Profile /></Layout>} />

                        {/* Admin Route */}
                        <Route path="/admin" element={
                            <Layout>
                                <AdminPanel />
                            </Layout>
                        } />
                    </Routes>
                </HashRouter>
            </FinanceProvider>
        </AuthProvider>
    );
};

export default App;