import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getMonthKey } from '../services/financeUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { 
    transactions, balanceOffset, categories, setBalanceOffset, 
    recurringExpenses, goals 
  } = useFinance();
  
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(balanceOffset.toString());

  const currentMonthKey = getMonthKey(new Date());
  const currentMonthTx = transactions.filter(t => t.date.startsWith(currentMonthKey));

  const totalIncome = currentMonthTx
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = currentMonthTx
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Total absolute balance calculation
  const allTimeIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const allTimeExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  
  // Logic: Current Balance = Offset (Equity) + All Time P&L
  const currentBalance = balanceOffset + allTimeIncome - allTimeExpense;

  const handleSaveBalance = () => {
    // User sets the DESIRED resulting balance.
    // We calculate the offset needed to achieve this.
    // Target = NewOffset + Income - Expense
    // NewOffset = Target - (Income - Expense)
    const targetBalance = parseFloat(tempBalance);
    if (isNaN(targetBalance)) return;

    const netHistory = allTimeIncome - allTimeExpense;
    const newOffset = targetBalance - netHistory;
    
    setBalanceOffset(newOffset);
    setIsEditingBalance(false);
  };

  const startEditing = () => {
    // When editing, we show the current RESULTING balance, not the internal offset
    setTempBalance(currentBalance.toFixed(2)); 
    setIsEditingBalance(true);
  }

  // Chart Data: Expenses by Category
  const expenseByCategory = categories.map(cat => {
    const value = currentMonthTx
      .filter(t => t.type === 'expense' && t.categoryId === cat.id)
      .reduce((acc, t) => acc + t.amount, 0);
    return { name: cat.name, value, color: cat.color };
  }).filter(d => d.value > 0);

  // Alerts
  const nearDueRecurrings = recurringExpenses.filter(r => {
    if (!r.active) return false;
    const today = new Date().getDate();
    const diff = r.dueDay - today;
    return diff >= 0 && diff <= 5 && r.lastGeneratedMonth !== currentMonthKey;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Saldo Atual (Total)</h3>
            <Wallet className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-end space-x-2">
            {isEditingBalance ? (
              <div className="flex items-center space-x-2">
                <input 
                  type="number"
                  step="0.01" 
                  value={tempBalance} 
                  onChange={(e) => setTempBalance(e.target.value)}
                  className="w-32 px-2 py-1 border rounded dark:bg-gray-800 dark:text-white"
                  autoFocus
                />
                <button onClick={handleSaveBalance} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600">OK</button>
              </div>
            ) : (
              <div 
                className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 transition"
                title="Clique para editar manualmente o saldo"
                onClick={startEditing}
              >
                {formatCurrency(currentBalance)}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Clique no valor para definir o saldo real da conta</p>
        </div>

        {/* Monthly Income */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Entradas (Mês)</h3>
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Saídas (Mês)</h3>
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpense)}
          </div>
        </div>
      </div>

      {/* Alerts Area */}
      {nearDueRecurrings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
            <h4 className="font-semibold text-amber-800 dark:text-amber-200">Atenção: Contas Próximas</h4>
          </div>
          <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {nearDueRecurrings.map(r => (
              <li key={r.id}>• {r.name} vence dia {r.dueDay} ({formatCurrency(r.amount)})</li>
            ))}
          </ul>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">Gastos por Categoria (Mês)</h3>
          <div className="h-64">
             {expenseByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                        formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                    Sem dados de gastos este mês
                </div>
             )}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[350px]">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">Objetivos Financeiros</h3>
          {goals.length === 0 ? (
             <p className="text-gray-400 text-center py-10">Nenhum objetivo cadastrado.</p>
          ) : (
             <div className="space-y-4">
               {goals.map(goal => {
                 const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                 const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
                 return (
                   <div key={goal.id}>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium dark:text-gray-300">{goal.name}</span>
                       <div className="text-right">
                          <span className="text-gray-500 dark:text-gray-400 block">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                       </div>
                     </div>
                     <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                       <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${progress}%` }}
                       ></div>
                     </div>
                   </div>
                 )
               })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;