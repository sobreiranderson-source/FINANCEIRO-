import React, { useState } from 'react';
// Updated version to force Vercel redeploy
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../services/financeUtils';
import { Trash2, Edit2, Filter, Plus } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

const Transactions = () => {
  const {
    transactions, deleteTransaction, addTransaction, categories, cards, goals, recurringExpenses
  } = useFinance();

  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    cardId: '',
    goalId: '',
    recurringExpenseId: ''
  });

  const filteredTransactions = transactions.filter(t => {
    const matchesDate = t.date.startsWith(filterDate);
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesDate && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.categoryId) return;

    addTransaction({
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      date: formData.date,
      categoryId: formData.categoryId,
      cardId: formData.cardId || undefined,
      goalId: formData.goalId || undefined,
      recurringExpenseId: formData.recurringExpenseId || undefined
    });

    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      cardId: '',
      goalId: '',
      recurringExpenseId: ''
    });
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold dark:text-white">Movimentações</h2>

        <div className="flex gap-2 flex-wrap">
          <input
            type="month"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <option value="all">Todas</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhuma movimentação neste período.</td>
                </tr>
              ) : filteredTransactions.map((tx) => {
                const category = categories.find(c => c.id === tx.categoryId);
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 dark:text-gray-300">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 dark:text-gray-200">
                      {tx.description}
                      {tx.cardId && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Cartão</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: category?.color || '#ccc' }}>
                        {category?.name || 'Sem Categoria'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-xl w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2 dark:text-white">Excluir Movimentação?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 dark:text-white dark:border-gray-600">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Nova Movimentação</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={() => setFormData({ ...formData, type: 'expense' })}
                    className="accent-red-500"
                  /> Saída
                </label>
                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={() => setFormData({ ...formData, type: 'income' })}
                    className="accent-emerald-500"
                  /> Entrada
                </label>
              </div>

              <input
                required
                type="text"
                placeholder="Descrição"
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  required
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
                <input
                  required
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <select
                required
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Selecione Categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {formData.type === 'expense' && cards.length > 0 && (
                <select
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.cardId}
                  onChange={e => setFormData({ ...formData, cardId: e.target.value })}
                >
                  <option value="">Sem cartão de crédito</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {formData.type === 'expense' && recurringExpenses.length > 0 && (
                <select
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.recurringExpenseId}
                  onChange={e => {
                    const rec = recurringExpenses.find(r => r.id === e.target.value);
                    setFormData({
                      ...formData,
                      recurringExpenseId: e.target.value,
                      description: rec ? rec.name : formData.description,
                      amount: rec ? rec.amount.toString() : formData.amount,
                      categoryId: rec ? rec.categoryId : formData.categoryId
                    });
                  }}
                >
                  <option value="">Vincular a Gasto Fixo (Opcional)</option>
                  {recurringExpenses.map(r => {
                    const isPaid = transactions.some(t =>
                      t.recurringExpenseId === r.id &&
                      t.date.startsWith(formData.date.slice(0, 7))
                    );
                    return (
                      <option key={r.id} value={r.id} disabled={isPaid}>
                        {r.name} {isPaid ? '(Já pago)' : `(${formatCurrency(r.amount)})`}
                      </option>
                    );
                  })}
                </select>
              )}

              {formData.type === 'income' && goals.length > 0 && (
                <select
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.goalId}
                  onChange={e => setFormData({ ...formData, goalId: e.target.value })}
                >
                  <option value="">Vincular a Objetivo (Opcional)</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;