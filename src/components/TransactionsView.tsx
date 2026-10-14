import React, { useState } from 'react';
import { Account, AutoCategoryRule, Category, Transaction } from '../types';
import { formatDateWithWeekday, formatCurrency, formatSignedAmount, MONTH_NAMES_PT } from '../utils/formatters';
import { AddTransactionBar } from './AddTransactionBar';
import { getAccountTransactionImpact, getCurrentDateInputValue, getYearOptions } from '../lib/persistence';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LineChart,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  FileDown,
  HelpCircle,
  Clock,
  Pencil,
  ChevronDown
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  selectedAccountIds: string[];
  selectedCategoryNames: string[];
  searchQuery: string;
  selectedMonth: number; // 0-11
  selectedYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonthYear: (year: number, month: number) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>, count?: number) => void;
  rules: AutoCategoryRule[];
  onCreateRule: (rule: AutoCategoryRule) => void;
  onDeleteTransactions: (ids: string[]) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onToggleConsolidate: (id: string) => void;
  onBatchConsolidate: (ids: string[], status: boolean) => void;
  onBatchChangeCategory: (ids: string[], newCat: string) => void;
  onOpenExportModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  selectedAccountIds,
  selectedCategoryNames,
  searchQuery,
  selectedMonth,
  selectedYear,
  onPrevMonth,
  onNextMonth,
  onSelectMonthYear,
  onAddTransaction,
  rules,
  onCreateRule,
  onDeleteTransactions,
  onDeleteTransaction,
  onEditTransaction,
  onToggleConsolidate,
  onBatchConsolidate,
  onBatchChangeCategory,
  onOpenExportModal,
}) => {
  const [showAddBar, setShowAddBar] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'consolidated' | 'pending'>('all');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Month selector dropdown toggle
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  // Filter transactions
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  
  const filteredTxs = transactions.filter((tx) => {
    // Month filter
    if (!tx.date.startsWith(monthStr)) return false;

    // Accounts filter
    if (selectedAccountIds.length === 0) return false;
    if (selectedAccountIds.length < accounts.length) {
      const account = accounts.find((item) => item.name === tx.account);
      if (!account || !selectedAccountIds.includes(account.id)) return false;
    }

    // Category filter
    if (selectedCategoryNames.length > 0) {
      if (!selectedCategoryNames.includes(tx.category)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'consolidated' && !tx.isConsolidated) return false;
    if (statusFilter === 'pending' && tx.isConsolidated) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchAcc = tx.account.toLowerCase().includes(q);
      const matchNote = tx.note?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchAcc && !matchNote) return false;
    }

    return true;
  });

  // Group by date
  const groupedByDate: Record<string, Transaction[]> = {};
  filteredTxs.forEach((tx) => {
    if (!groupedByDate[tx.date]) groupedByDate[tx.date] = [];
    groupedByDate[tx.date].push(tx);
  });

  const dates = Object.keys(groupedByDate).sort();

  // Calculate daily progressive balance
  const monthStart = `${monthStr}-01`;
  const openingBalance = accounts
    .filter((account) => selectedAccountIds.includes(account.id))
    .reduce((total, account) => {
      const priorTransactions = transactions
        .filter(
          (transaction) =>
            transaction.date < monthStart &&
            transaction.isConsolidated &&
            statusFilter !== 'pending'
        )
        .reduce((sum, transaction) => sum + getAccountTransactionImpact(transaction, account.name), 0);
      return total + (statusFilter === 'pending' ? 0 : account.initialBalance) + priorTransactions;
    }, 0);
  let runningBalance = openingBalance;
  const dailyBalances: Record<string, number> = {};
  dates.forEach((d) => {
    const dayTotal = groupedByDate[d].reduce(
      (total, transaction) =>
        total +
        accounts
          .filter((account) => selectedAccountIds.includes(account.id))
          .reduce(
            (impact, account) =>
              impact +
              (transaction.isConsolidated
                ? getAccountTransactionImpact(transaction, account.name)
                : 0),
            0
          ),
      0
    );
    runningBalance += dayTotal;
    dailyBalances[d] = runningBalance;
  });

  // Selection handlers
  const handleSelectAllTxs = (checked: boolean) => {
    if (checked) {
      setSelectedTxIds(filteredTxs.map(t => t.id));
    } else {
      setSelectedTxIds([]);
    }
  };

  const handleToggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDayCollapse = (dateStr: string) => {
    setCollapsedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  // Flattened categories for batch change
  const flatCategories: string[] = ['Sem Categoria'];
  categories.forEach(cat => {
    if (cat.name !== 'Sem Categoria') {
      flatCategories.push(cat.name);
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => flatCategories.push(sub));
      }
    }
  });

  const monthLabel = `${MONTH_NAMES_PT[selectedMonth]}/${selectedYear}`;

  return (
    <div className="flex-1 bg-white min-w-0 text-[14.5px] font-sans select-none text-[#000000]">
      {/* 1. TOP NAV / DATE CONTROLS BAR */}
      <div className="flex items-center justify-between py-2 border-b border-[#bbbbbb] mb-3 flex-wrap gap-2">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="w-7 h-7 flex items-center justify-center bg-[#f0f0f0] hover:bg-[#e4e4e4] border border-[#999] rounded-xs cursor-pointer text-[#000000] font-black text-[13px]"
            title="Mês anterior"
          >
            ◀
          </button>

          {/* Month Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#fbfbfb] hover:bg-white border border-[#888888] font-black text-[15px] text-[#000000] rounded-xs cursor-pointer"
            >
              <span>{monthLabel}</span>
              <span className="text-[12px] text-green-700 font-black">▼</span>
            </button>

            {monthDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#888888] shadow-xl py-1 z-30 max-h-60 overflow-y-auto">
                {getYearOptions(transactions, selectedYear).map(yr => (
                  <div key={yr}>
                    <div className="px-3 py-1 font-bold text-[12px] bg-gray-100 text-[#000000]">{yr}</div>
                    {MONTH_NAMES_PT.map((m, idx) => (
                      <button
                        key={`${yr}-${idx}`}
                        onClick={() => {
                          onSelectMonthYear(yr, idx);
                          setMonthDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 hover:bg-[#f1f6df] cursor-pointer text-[13.5px] font-bold ${
                          selectedMonth === idx && selectedYear === yr ? 'text-[#73a000]' : 'text-[#000000]'
                        }`}
                      >
                        {m} / {yr}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onNextMonth}
            className="w-7 h-7 flex items-center justify-center bg-[#f0f0f0] hover:bg-[#e4e4e4] border border-[#999] rounded-xs cursor-pointer text-[#000000] font-black text-[13px]"
            title="Próximo mês"
          >
            ▶
          </button>

          {/* Filter preset dropdown: "Todas as transações ▾" */}
          <div className="ml-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-1.5 bg-white border border-[#888888] rounded-xs text-[13.5px] font-bold text-[#000000] focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as transações</option>
              <option value="consolidated">Somente consolidadas</option>
              <option value="pending">Somente pendentes</option>
            </select>
          </div>
        </div>

        {/* Right Action Icons (Filter & Chart) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Filtros avançados: use o painel de Categorias e Contas à esquerda para refinar')}
            className="p-1.5 border border-[#999] bg-[#f9f9f9] hover:bg-[#e8e8e8] rounded-xs text-[#000000] cursor-pointer"
            title="Filtro"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert('Visualização gráfica rápida')}
            className="p-1.5 border border-[#999] bg-[#f9f9f9] hover:bg-[#e8e8e8] rounded-xs text-[#000000] cursor-pointer"
            title="Gráfico do mês"
          >
            <LineChart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TABLE TOOLBAR (Adicionar, Delete, Consolidate, Export) */}
      <div className="flex items-center justify-between bg-[#f5f5f5] p-2.5 border border-[#b0b0b0] mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* "+ Adicionar transação" dark button */}
          <button
            onClick={() => setShowAddBar(!showAddBar)}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#000000] text-white px-4 py-1.5 rounded-xs font-bold text-[13.5px] cursor-pointer shadow-xs active:translate-y-px"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar transação</span>
          </button>

          {/* Delete Selected (✕) */}
          <button
            onClick={() => {
              if (selectedTxIds.length === 0) return alert('Selecione pelo menos uma transação para excluir.');
              if (confirm(`Excluir as ${selectedTxIds.length} transações selecionadas?`)) {
                onDeleteTransactions(selectedTxIds);
                setSelectedTxIds([]);
              }
            }}
            disabled={selectedTxIds.length === 0}
            className={`w-8 h-8 flex items-center justify-center border border-[#999] rounded-xs cursor-pointer text-[14px] font-black ${
              selectedTxIds.length > 0 ? 'bg-white hover:bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Excluir selecionadas"
          >
            ✕
          </button>

          {/* Consolidate Selected (✓) */}
          <button
            onClick={() => {
              if (selectedTxIds.length === 0) return alert('Selecione transações para consolidar.');
              onBatchConsolidate(selectedTxIds, true);
            }}
            disabled={selectedTxIds.length === 0}
            className={`w-8 h-8 flex items-center justify-center border border-[#999] rounded-xs cursor-pointer text-[14px] font-black ${
              selectedTxIds.length > 0 ? 'bg-white hover:bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Marcar como consolidadas"
          >
            ✓
          </button>

          {/* Desconsolidar Selected (✓/) */}
          <button
            onClick={() => {
              if (selectedTxIds.length === 0) return alert('Selecione transações para desmarcar.');
              onBatchConsolidate(selectedTxIds, false);
            }}
            disabled={selectedTxIds.length === 0}
            className={`w-8 h-8 flex items-center justify-center border border-[#999] rounded-xs cursor-pointer text-[14px] font-black ${
              selectedTxIds.length > 0 ? 'bg-white hover:bg-yellow-50 text-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Marcar como não consolidadas"
          >
            <span className="line-through">✓</span>
          </button>

          {/* Alterar Categoria Dropdown */}
          <div className="relative">
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              disabled={selectedTxIds.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 border border-[#999] rounded-xs text-[13px] font-bold cursor-pointer ${
                selectedTxIds.length > 0 ? 'bg-white hover:bg-gray-50 text-[#000000]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Alterar categoria</span>
              <span className="text-[11px]">▼</span>
            </button>

            {categoryDropdownOpen && selectedTxIds.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-[#777] shadow-xl py-1 z-30 max-h-60 overflow-y-auto">
                {flatCategories.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onBatchChangeCategory(selectedTxIds, c);
                      setCategoryDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-[#f1f6df] text-[13px] font-bold text-[#000000] cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exportar Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#999] bg-gradient-to-b from-[#ffffff] to-[#e4e4e4] hover:to-[#dadada] text-[#000000] font-black rounded-xs text-[13px] cursor-pointer active:translate-y-px"
          >
            <FileDown className="w-4 h-4 text-black" />
            <span>Exportar</span>
          </button>
        </div>

        {/* Right Help Tooltip */}
        <button
          onClick={() => alert('Dica: você pode selecionar transações para editar em lote, ou clicar no ícone ✓ para consolidar.')}
          className="w-7 h-7 flex items-center justify-center border border-[#999] bg-[#fbfbfb] hover:bg-gray-200 text-[#000000] font-black rounded-xs cursor-pointer text-[12px]"
          title="Ajuda"
        >
          ?
        </button>
      </div>

      {/* 3. INLINE ADD TRANSACTION BAR */}
      {showAddBar && (
        <AddTransactionBar
          accounts={accounts}
          categories={categories}
          currentDateStr={getCurrentDateInputValue()}
          onSave={(newTx, count) => {
            onAddTransaction(newTx, count);
            setShowAddBar(false);
          }}
          rules={rules}
          onCreateRule={onCreateRule}
          onCancel={() => setShowAddBar(false)}
        />
      )}

      {/* 4. MAIN TRANSACTIONS TABLE */}
      <div className="border border-[#b8b8b8] bg-white overflow-x-auto shadow-xs">
        <div className="min-w-[680px]">
        {/* Table Header Columns */}
        <div className="flex items-center bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 font-black text-[#000000] text-[14px]">
          <div className="w-6 flex items-center justify-center">
            <input
              type="checkbox"
              checked={filteredTxs.length > 0 && selectedTxIds.length === filteredTxs.length}
              onChange={(e) => handleSelectAllTxs(e.target.checked)}
              className="accent-[#73a000] cursor-pointer w-4 h-4"
            />
          </div>
          <div className="flex-1 px-3 font-black">Descrição</div>
          <div className="w-[195px] px-3 font-black">Categoria</div>
          <div className="w-[165px] px-3 font-black">Conta</div>
          <div className="w-[145px] px-3 text-right font-black">Valor (R$)</div>
          <div className="w-10 px-1 text-center font-black" title="Status de consolidação">C</div>
        </div>

        {/* Opening balance for the selected month */}
        <div className="flex items-center justify-between bg-[#edf3f8] border-b border-[#b8cce0] px-3 py-2 font-bold text-[#000000]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllCollapsed(!allCollapsed)}
              className="w-4 h-4 flex items-center justify-center border border-[#777] bg-white text-[11px] font-black text-[#000000] cursor-pointer leading-none"
            >
              {allCollapsed ? '+' : '-'}
            </button>
            <span className="text-[14px] font-black text-[#000000]">Todos</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[14px] font-bold text-[#000000]">
              Saldo em {new Date(selectedYear, selectedMonth, 0).toLocaleDateString('pt-BR')}
              <span className="ml-3 tabular-nums font-black text-[#000000]">{formatCurrency(openingBalance)}</span>
            </div>
            <input
              type="checkbox"
              checked={filteredTxs.length > 0 && selectedTxIds.length === filteredTxs.length}
              onChange={(e) => handleSelectAllTxs(e.target.checked)}
              className="accent-[#73a000] cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {/* Empty State */}
        {dates.length === 0 && (
          <div className="p-8 text-center text-red-600 font-black text-[15px]">
            Nenhuma transação encontrada neste período.
          </div>
        )}

        {/* Grouped Day Rows */}
        {!allCollapsed && dates.map((dateStr) => {
          const dayTxs = groupedByDate[dateStr];
          const isDayCollapsed = collapsedDays[dateStr];
          const dayProgressiveBalance = dailyBalances[dateStr] ?? 0;

          return (
            <div key={dateStr} className="border-b border-[#cccccc]">
              {/* Day Header */}
              <div
                className="flex items-center gap-2.5 bg-[#f6f6f6] hover:bg-[#ededed] px-3 py-2 border-b border-[#dcdcdc] cursor-pointer transition-colors"
                onClick={() => toggleDayCollapse(dateStr)}
              >
                <button
                  type="button"
                  className="w-4 h-4 flex items-center justify-center border border-[#888] bg-white text-[11px] font-black text-[#000000] leading-none"
                >
                  {isDayCollapsed ? '+' : '-'}
                </button>
                <span className="font-black text-[#000000] text-[14px]">
                  {formatDateWithWeekday(dateStr)}
                </span>
              </div>

              {/* Transactions in Day */}
              {!isDayCollapsed && (
                <div>
                  {dayTxs.map((tx) => {
                    const isSelected = selectedTxIds.includes(tx.id);
                    const isNegative = tx.amount < 0;

                    return (
                      <div
                        key={tx.id}
                        className={`flex items-center px-3 py-2 border-b border-gray-200 last:border-b-0 text-[14px] hover:bg-[#f4fae6] transition-colors group ${
                          isSelected ? 'bg-[#edf6d8]' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="w-6 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTx(tx.id)}
                            className="accent-[#73a000] cursor-pointer w-4 h-4"
                          />
                        </div>

                        {/* Description */}
                        <div
                          className="flex-1 px-3 font-bold text-[#000000] truncate flex items-center gap-2 cursor-pointer hover:underline"
                          onClick={() => onEditTransaction(tx)}
                          title="Clique para editar transação"
                        >
                          <span className="truncate">{tx.description}</span>
                          {tx.recurrenceText && (
                            <span className="text-[12.5px] text-[#222222] font-bold">
                              ({tx.recurrenceText})
                            </span>
                          )}
                        </div>

                        {/* Category */}
                        <div className="w-[195px] px-3 text-[#000000] font-semibold truncate flex items-center gap-1.5">
                          {tx.isRecurring && (
                            <span className="text-[#000000] text-[12px] font-bold" title="Transação recorrente">
                              🕒
                            </span>
                          )}
                          <span className="truncate">{tx.category}</span>
                        </div>

                        {/* Account */}
                        <div className="w-[165px] px-3 text-[#000000] font-bold truncate">
                          {tx.account}
                        </div>

                        {/* Amount & Action Buttons */}
                        <div className="w-[145px] px-3 flex items-center justify-end gap-2">
                          <span
                            className={`font-black tabular-nums text-[14.5px] ${
                              isNegative ? 'text-[#dc2626]' : 'text-[#15803d]'
                            }`}
                          >
                            {formatSignedAmount(tx.amount)}
                          </span>

                          <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTransaction(tx);
                              }}
                              className="text-black hover:text-green-700 p-0.5 cursor-pointer text-[13px] font-black"
                              title="Editar transação"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Excluir transação "${tx.description}"?`)) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="text-black hover:text-red-700 p-0.5 cursor-pointer text-[13px] font-black"
                              title="Excluir transação"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Status Checkmark (C) */}
                        <div className="w-10 px-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => onToggleConsolidate(tx.id)}
                            className="cursor-pointer hover:opacity-80 p-0.5"
                            title={tx.isConsolidated ? 'Consolidada (clique para desmarcar)' : 'Pendente (clique para consolidar)'}
                          >
                            {tx.isConsolidated ? (
                              <CheckCheck className="w-4.5 h-4.5 text-[#000000] stroke-[3]" />
                            ) : (
                              <span className="text-[#666666] text-[14px] font-black">○</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Daily Subtotal: Dashed Line & Saldo do dia */}
                  <div className="border-t-2 border-dashed border-[#888888] px-4 py-2 flex items-center justify-end gap-10 bg-[#fafafa]">
                    <span className="font-black text-[#000000] text-[14px]">Saldo do dia</span>
                    <span className="font-black text-[#000000] tabular-nums text-[14.5px]">
                      {formatCurrency(dayProgressiveBalance)}
                    </span>
                    <div className="w-10" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
