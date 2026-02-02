import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../services/financeUtils';
import { Layers, Plus, Search, Trash2, Edit2, CheckCircle, XCircle, ChevronDown, ChevronUp, History, Undo2, AlertTriangle } from 'lucide-react';
import { InstallmentPurchase } from '../types';

const Installments = () => {
    const { 
        installments, addInstallment, updateInstallment, deleteInstallment, 
        payNextInstallment, undoLastInstallment,
        categories, cards, transactions 
    } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        type: 'pay' | 'undo' | 'delete' | 'cancel';
        id: string;
        message: React.ReactNode;
        payload?: any;
    } | null>(null);

    // Form State
    const [form, setForm] = useState({
        description: '',
        categoryId: '',
        cardId: '',
        totalInstallments: '',
        installmentAmount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        dueDay: '10',
        notes: ''
    });

    const getProgress = (inst: InstallmentPurchase) => {
        const related = transactions.filter(t => t.installmentId === inst.id);
        const paidCount = related.length;
        const progress = Math.min((paidCount / inst.totalInstallments) * 100, 100);
        return { paidCount, progress, related };
    };

    const handleOpenModal = (inst?: InstallmentPurchase) => {
        if (inst) {
            setEditingId(inst.id);
            setForm({
                description: inst.description,
                categoryId: inst.categoryId,
                cardId: inst.cardId || '',
                totalInstallments: inst.totalInstallments.toString(),
                installmentAmount: inst.installmentAmount.toString(),
                purchaseDate: inst.purchaseDate,
                dueDay: inst.dueDay.toString(),
                notes: inst.notes || ''
            });
        } else {
            setEditingId(null);
            setForm({
                description: '',
                categoryId: '',
                cardId: '',
                totalInstallments: '',
                installmentAmount: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                dueDay: '10',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            description: form.description,
            categoryId: form.categoryId,
            cardId: form.cardId || undefined,
            totalInstallments: parseInt(form.totalInstallments),
            installmentAmount: parseFloat(form.installmentAmount),
            totalAmount: parseInt(form.totalInstallments) * parseFloat(form.installmentAmount),
            purchaseDate: form.purchaseDate,
            dueDay: parseInt(form.dueDay),
            notes: form.notes
        };

        if (editingId) {
            const original = installments.find(i => i.id === editingId);
            if (original) {
                updateInstallment({ ...original, ...payload });
            }
        } else {
            addInstallment(payload);
        }
        setIsModalOpen(false);
    };

    const initiateDelete = (id: string) => {
        setConfirmModal({
            type: 'delete',
            id,
            message: 'Deseja excluir este parcelamento?'
        });
    };

    const initiatePay = (inst: InstallmentPurchase, paidCount: number) => {
        const nextNum = paidCount + 1;
        setConfirmModal({
            type: 'pay',
            id: inst.id,
            message: (
                <div>
                    <p className="mb-2">Confirmar pagamento da parcela <strong>{nextNum}/{inst.totalInstallments}</strong>?</p>
                    <p className="text-sm text-gray-500">Valor: {formatCurrency(inst.installmentAmount)}</p>
                    <p className="text-sm text-gray-500 mt-1">Isso gerará uma saída no seu extrato hoje.</p>
                </div>
            )
        });
    };

    const initiateUndo = (inst: InstallmentPurchase) => {
        setConfirmModal({
            type: 'undo',
            id: inst.id,
            message: 'Desfazer o último pagamento de parcela? A saída correspondente será excluída do extrato.'
        });
    };

    const initiateCancel = (inst: InstallmentPurchase) => {
        setConfirmModal({
            type: 'cancel',
            id: inst.id,
            message: 'Cancelar parcelas futuras deste item? O histórico já pago será mantido.'
        });
    };

    const handleConfirmAction = (deleteTransactions = false) => {
        if (!confirmModal) return;

        switch (confirmModal.type) {
            case 'pay':
                payNextInstallment(confirmModal.id);
                break;
            case 'undo':
                undoLastInstallment(confirmModal.id);
                break;
            case 'delete':
                deleteInstallment(confirmModal.id, deleteTransactions);
                break;
            case 'cancel':
                const inst = installments.find(i => i.id === confirmModal.id);
                if (inst) updateInstallment({ ...inst, status: 'cancelled' });
                break;
        }
        setConfirmModal(null);
    };

    const filteredList = installments.filter(inst => {
        const matchesStatus = filterStatus === 'all' || inst.status === filterStatus;
        const matchesSearch = inst.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Layers className="w-6 h-6 text-indigo-500" />
                    <h2 className="text-xl font-bold dark:text-white">Compras Parceladas</h2>
                </div>
                
                <div className="flex gap-2 flex-wrap w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-2 w-full border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                        <option value="active">Em Andamento</option>
                        <option value="completed">Concluídas</option>
                        <option value="cancelled">Canceladas</option>
                        <option value="all">Todas</option>
                    </select>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Nova Compra
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredList.map(inst => {
                    const { paidCount, progress, related } = getProgress(inst);
                    const remaining = inst.totalInstallments - paidCount;
                    const cat = categories.find(c => c.id === inst.categoryId);
                    const card = cards.find(c => c.id === inst.cardId);

                    return (
                        <div key={inst.id} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between h-full relative overflow-hidden">
                            {inst.status === 'cancelled' && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl">Cancelado</div>}
                            {inst.status === 'completed' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-bl">Concluído</div>}
                            
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg dark:text-white truncate pr-6">{inst.description}</h3>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs px-2 py-0.5 rounded text-white" style={{backgroundColor: cat?.color || '#999'}}>{cat?.name}</span>
                                    {card && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 flex items-center gap-1"><Layers className="w-3 h-3"/> {card.name}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <p className="text-gray-500">Parcela</p>
                                        <p className="font-semibold dark:text-gray-200">{formatCurrency(inst.installmentAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Total</p>
                                        <p className="font-semibold dark:text-gray-200">{formatCurrency(inst.totalAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Vencimento</p>
                                        <p className="dark:text-gray-200">Dia {inst.dueDay}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Início</p>
                                        <p className="dark:text-gray-200">{formatDate(inst.purchaseDate)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-medium dark:text-gray-300 mb-1">
                                        <span>Progresso: {paidCount}/{inst.totalInstallments}</span>
                                        <span>Faltam: {Math.max(0, remaining)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div 
                                            className={`h-2.5 rounded-full transition-all duration-500 ${inst.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                            style={{width: `${progress}%`}}
                                        ></div>
                                    </div>
                                </div>

                                {/* Actions Area */}
                                {inst.status === 'active' && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => initiatePay(inst, paidCount)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded flex items-center justify-center gap-1 transition"
                                        >
                                            <CheckCircle className="w-3 h-3"/> Abater 1 Parcela
                                        </button>
                                        {paidCount > 0 && (
                                            <button 
                                                onClick={() => initiateUndo(inst)}
                                                className="px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium py-2 rounded flex items-center justify-center transition"
                                                title="Desfazer último pagamento"
                                            >
                                                <Undo2 className="w-3 h-3"/>
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                {/* History Toggle */}
                                {paidCount > 0 && (
                                    <div>
                                        <button 
                                            onClick={() => setExpandedHistory(expandedHistory === inst.id ? null : inst.id)}
                                            className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1 w-full justify-center pt-2 border-t dark:border-gray-700"
                                        >
                                            <History className="w-3 h-3"/> {expandedHistory === inst.id ? 'Ocultar Histórico' : 'Ver Histórico'} {expandedHistory === inst.id ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                        </button>
                                        
                                        {expandedHistory === inst.id && (
                                            <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                                                {related.sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                                                    <div key={tx.id} className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                                        <span>{formatDate(tx.date)}</span>
                                                        <span>{tx.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                                    {inst.status === 'active' && (
                                        <button onClick={() => initiateCancel(inst)} className="text-gray-400 hover:text-amber-500 p-1" title="Cancelar parcelas futuras">
                                            <XCircle className="w-4 h-4"/>
                                        </button>
                                    )}
                                    <button onClick={() => handleOpenModal(inst)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded" title="Editar">
                                        <Edit2 className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => initiateDelete(inst.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded" title="Excluir">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredList.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        Nenhum parcelamento encontrado.
                    </div>
                )}
            </div>

            {/* Custom Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-xl p-6 w-full max-w-sm shadow-2xl scale-100">
                        <div className="flex items-center gap-3 mb-4 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold dark:text-white">Confirmação</h3>
                        </div>
                        <div className="mb-6 text-gray-600 dark:text-gray-300">
                            {confirmModal.message}
                        </div>
                        
                        {confirmModal.type === 'delete' ? (
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => handleConfirmAction(false)}
                                    className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                                >
                                    Excluir mas manter histórico pago
                                </button>
                                <button 
                                    onClick={() => handleConfirmAction(true)}
                                    className="w-full border border-red-500 text-red-500 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Excluir TUDO (apagar histórico)
                                </button>
                                <button 
                                    onClick={() => setConfirmModal(null)}
                                    className="w-full text-gray-500 py-2 mt-2 hover:underline"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => handleConfirmAction()}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Confirmar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-dark-card rounded-xl p-6 w-full max-w-lg shadow-xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">{editingId ? 'Editar Parcelamento' : 'Nova Compra Parcelada'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input 
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white" 
                                placeholder="Descrição (ex: Notebook)" 
                                value={form.description} 
                                onChange={e => setForm({...form, description: e.target.value})} 
                                required 
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                                    <select 
                                        className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required
                                    >
                                        <option value="">Selecione</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Cartão (Opcional)</label>
                                    <select 
                                        className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.cardId} onChange={e => setForm({...form, cardId: e.target.value})}
                                    >
                                        <option value="">Nenhum (Dinheiro/Outro)</option>
                                        {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Nº Parcelas</label>
                                    <input 
                                        type="number" min="2" className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.totalInstallments} onChange={e => setForm({...form, totalInstallments: e.target.value})} required 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Valor da Parcela</label>
                                    <input 
                                        type="number" step="0.01" className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.installmentAmount} onChange={e => setForm({...form, installmentAmount: e.target.value})} required 
                                    />
                                </div>
                            </div>
                            
                            {form.totalInstallments && form.installmentAmount && (
                                <div className="text-right text-sm text-gray-500">
                                    Total Estimado: <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(parseInt(form.totalInstallments) * parseFloat(form.installmentAmount))}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Dia Venc. Mensal</label>
                                    <input 
                                        type="number" min="1" max="31" className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.dueDay} onChange={e => setForm({...form, dueDay: e.target.value})} required 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Data da Compra</label>
                                    <input 
                                        type="date" className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} required 
                                    />
                                </div>
                            </div>

                            <textarea 
                                className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white text-sm" 
                                placeholder="Observações..." 
                                rows={2}
                                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} 
                            />

                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border p-2 rounded dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                                <button type="submit" className="flex-1 bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Installments;