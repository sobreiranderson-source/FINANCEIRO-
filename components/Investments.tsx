import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../services/financeUtils';
import { TrendingUp, Plus, RefreshCw } from 'lucide-react';

const Investments = () => {
    const { investments, addInvestment, updateInvestment, categories } = useFinance();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Renda Fixa',
        amount: '',
        categoryId: '',
    });

    // Simple return update state
    const [updateReturnId, setUpdateReturnId] = useState<string | null>(null);
    const [returnValue, setReturnValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addInvestment({
            name: formData.name,
            type: formData.type,
            initialAmount: parseFloat(formData.amount),
            currentAmount: parseFloat(formData.amount),
            categoryId: formData.categoryId,
            startDate: new Date().toISOString().split('T')[0]
        });
        setIsFormOpen(false);
        setFormData({ name: '', type: 'Renda Fixa', amount: '', categoryId: '' });
    };

    const handleUpdateReturn = (id: string) => {
        const inv = investments.find(i => i.id === id);
        if(!inv) return;
        const newVal = parseFloat(returnValue);
        if(isNaN(newVal)) return;
        
        updateInvestment({
            ...inv,
            currentAmount: newVal
        });
        setUpdateReturnId(null);
        setReturnValue('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500"/> Carteira de Investimentos
                </h2>
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Novo Aporte
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investments.map(inv => {
                    const profit = inv.currentAmount - inv.initialAmount;
                    const profitPercent = ((profit / inv.initialAmount) * 100).toFixed(2);
                    const isPositive = profit >= 0;

                    return (
                        <div key={inv.id} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{inv.type}</span>
                                    <h3 className="font-bold text-lg mt-2 dark:text-white">{inv.name}</h3>
                                    <p className="text-sm text-gray-500">{formatDate(inv.startDate)}</p>
                                </div>
                                <div className={`text-right ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <p className="text-sm font-medium">{isPositive ? '+' : ''}{profitPercent}%</p>
                                    <p className="text-xs">Rendimento</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t dark:border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-400">Aplicado</p>
                                    <p className="font-semibold dark:text-gray-200">{formatCurrency(inv.initialAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Atual</p>
                                    <p className="font-bold text-lg dark:text-white">{formatCurrency(inv.currentAmount)}</p>
                                </div>
                            </div>

                            {updateReturnId === inv.id ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white"
                                        placeholder="Novo Valor Atual"
                                        value={returnValue}
                                        onChange={e => setReturnValue(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => handleUpdateReturn(inv.id)}
                                        className="bg-emerald-500 text-white px-2 rounded text-xs"
                                    >OK</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setUpdateReturnId(inv.id)}
                                    className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 py-2 rounded transition"
                                >
                                    <RefreshCw className="w-4 h-4" /> Atualizar Saldo
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal Form would go here, simplified for brevity: Inline logic above or similar structure to Transaction Modal */}
             {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-dark-card rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Novo Investimento</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input 
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white" 
                                placeholder="Nome (ex: Tesouro Direto)" 
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required 
                            />
                            <select 
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option>Renda Fixa</option>
                                <option>Ações</option>
                                <option>FIIs</option>
                                <option>Cripto</option>
                            </select>
                            <input 
                                type="number" step="0.01" className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                placeholder="Valor Inicial" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required 
                            />
                            <select 
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} required
                            >
                                <option value="">Categoria</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 border p-2 rounded dark:text-white">Cancelar</button>
                                <button type="submit" className="flex-1 bg-indigo-600 text-white p-2 rounded">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Investments;