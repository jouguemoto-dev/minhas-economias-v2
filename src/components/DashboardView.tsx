import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatSignedAmount, formatDateShortYear, MONTH_NAMES_PT } from '../utils/formatters';
import { AddTransactionBar } from './AddTransactionBar';
import { Plus, HelpCircle, Maximize2, Minus, Pencil, ExternalLink } from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonthYear: (year: number, month: number) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>, count?: number) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onNavigateToTransactions: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  accounts,
  categories,
  selectedMonth,
  selectedYear,
  onPrevMonth,
  onNextMonth,
  onSelectMonthYear,
  onAddTransaction,
  onEditTransaction,
  onNavigateToTransactions,
}) => {
  const [showAddBar, setShowAddBar] = useState(false);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  // Widget collapse states
  const [entradasOpen, setEntradasOpen] = useState(true);
  const [anterioresOpen, setAnterioresOpen] = useState(true);
  const [despesasOpen, setDespesasOpen] = useState(true);
  const [proximasOpen, setProximasOpen] = useState(true);
  const [saldoContasOpen, setSaldoContasOpen] = useState(true);
  const [alertasOpen, setAlertasOpen] = useState(true);
  const [ultimasOpen, setUltimasOpen] = useState(false);

  const monthLabel = `${MONTH_NAMES_PT[selectedMonth]}/${selectedYear}`;
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Current month transactions
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(monthKey));
  const incomeTotal = currentMonthTxs.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const expenseTotal = currentMonthTxs.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  
  // Previous balance (from before this month)
  const previousTxs = transactions.filter(t => t.date < `${monthKey}-01`);
  const previousBalance = previousTxs.reduce((acc, t) => acc + t.amount, 0);

  const netBalance = (includePreviousBalance ? previousBalance : 0) + incomeTotal - expenseTotal;

  // Upcoming non-consolidated or next month transactions (from screenshots: November 2026)
  const upcomingTxs = transactions
    .filter(t => t.date > `${monthKey}-31` || (!t.isConsolidated && t.date >= `${monthKey}-01`))
    .slice(0, 8);

  // Past non-consolidated
  const pastUnconsolidated = transactions.filter(t => t.date < `${monthKey}-01` && !t.isConsolidated);

  // Category breakdown for current month
  const expenseByCategory: Record<string, number> = {};
  currentMonthTxs.filter(t => t.amount < 0).forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Math.abs(t.amount);
  });
  const hasExpenses = Object.keys(expenseByCategory).length > 0;

  return (
    <div className="flex-1 bg-white min-w-0 text-[14.5px] font-sans select-none text-[#000000]">
      {/* 1. TOP HEADER SUB-BAR */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#bbbbbb] flex-wrap gap-2">
        {/* Date Selector & Add Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onPrevMonth}
            className="w-7 h-7 flex items-center justify-center bg-[#f0f0f0] hover:bg-[#e4e4e4] border border-[#999] rounded-xs cursor-pointer text-[#000000] font-black text-[13px]"
            title="Mês anterior"
          >
            ◀
          </button>

          {/* Month selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[#fbfbfb] hover:bg-white border border-[#888888] font-black text-[14px] sm:text-[15px] text-[#000000] rounded-xs cursor-pointer"
            >
              <span>{monthLabel}</span>
              <span className="text-[12px] text-green-700 font-black">▼</span>
            </button>

            {monthDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#888888] shadow-xl py-1 z-30 max-h-60 overflow-y-auto">
                {[2026, 2027].map(yr => (
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

          {/* "+ Adicionar transação" Button */}
          <button
            onClick={() => setShowAddBar(!showAddBar)}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#000000] text-white px-3 sm:px-4 py-1.5 rounded-xs font-bold text-[13px] sm:text-[13.5px] cursor-pointer shadow-xs active:translate-y-px"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar transação</span>
          </button>
        </div>

        {/* Date & Last access display on right */}
        <div className="text-right">
          <div className="font-black text-[14.5px] text-[#000000]">
            Sexta-feira, 09/10/2026
          </div>
          <div className="text-[12.5px] font-bold text-[#000000]">
            Último acesso: 08/10/26 às 14:52h
          </div>
        </div>
      </div>

      {/* Inline Add Bar if open */}
      {showAddBar && (
        <AddTransactionBar
          accounts={accounts}
          categories={categories}
          currentDateStr={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-09`}
          onSave={(newTx, count) => {
            onAddTransaction(newTx, count);
            setShowAddBar(false);
          }}
          onCancel={() => setShowAddBar(false)}
        />
      )}

      {/* 2. MAIN WIDGETS GRID (Exact layout from Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ROW 1 - LEFT: ENTRADAS E SAÍDAS */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Entradas e saídas</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setEntradasOpen(!entradasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {entradasOpen ? '-' : '+'}
              </button>
              <button
                onClick={() => alert('Resumo mensal de todas as entradas e saídas e saldo acumulado.')}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {entradasOpen && (
            <div className="p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-[#000000] font-bold text-[14px]">
                <input
                  type="checkbox"
                  checked={includePreviousBalance}
                  onChange={(e) => setIncludePreviousBalance(e.target.checked)}
                  className="w-4 h-4 accent-[#0078d7] cursor-pointer"
                />
                <span>Incluir saldo anterior</span>
              </label>

              <div className="space-y-2 pt-1 text-[14.5px]">
                <div className="flex items-center justify-between text-[#000000] font-bold">
                  <span>Saldo anterior</span>
                  <span className="tabular-nums font-black text-[#000000]">{formatCurrency(previousBalance)}</span>
                </div>
                <div className="flex items-center justify-between text-[#000000] font-bold">
                  <span>Entradas</span>
                  <span className="tabular-nums font-black text-[#15803d]">{formatCurrency(incomeTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#000000] font-bold">
                  <span>Saídas</span>
                  <span className="tabular-nums font-black text-[#dc2626]">{formatCurrency(expenseTotal)}</span>
                </div>
              </div>

              {/* Separator line */}
              <div className="border-t-2 border-[#b8b8b8] pt-3 flex justify-end">
                <div className="font-black text-[34px] text-[#000000] leading-none tabular-nums">
                  {formatCurrency(netBalance)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ROW 1 - RIGHT: ANTERIORES NÃO CONSOLIDADAS */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Anteriores não consolidadas</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setAnterioresOpen(!anterioresOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {anterioresOpen ? '-' : '+'}
              </button>
              <button
                onClick={() => alert('Transações de períodos anteriores ainda pendentes de consolidação.')}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {anterioresOpen && (
            <div className="p-3.5 min-h-[140px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#000000] font-black border-b border-[#bbbbbb] pb-1.5 text-[13.5px]">
                <span className="w-1/2">Transações</span>
                <span className="w-1/4 text-center">Data</span>
                <span className="w-1/4 text-right">Valor (R$)</span>
              </div>

              {pastUnconsolidated.length === 0 ? (
                <div className="py-8 text-center text-red-600 font-black text-[14px]">
                  Nenhuma transação encontrada
                </div>
              ) : (
                <div className="space-y-1.5 py-1">
                  {pastUnconsolidated.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1 text-[13.5px] font-bold text-[#000000]">
                      <span className="w-1/2 truncate">{tx.description}</span>
                      <span className="w-1/4 text-center text-[#000000] font-semibold">{formatDateShortYear(tx.date)}</span>
                      <span className="w-1/4 text-right tabular-nums font-black">{formatSignedAmount(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div />
            </div>
          )}
        </div>

        {/* ROW 2 - LEFT: DESPESAS */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Despesas</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setDespesasOpen(!despesasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {despesasOpen ? '-' : '+'}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
                title="Maximizar"
                onClick={onNavigateToTransactions}
              >
                ⤢
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {despesasOpen && (
            <div className="p-3.5 min-h-[160px] flex flex-col justify-between">
              <div className="text-[#000000] text-[13.5px] font-bold mb-2">Todas as Categorias</div>

              {!hasExpenses ? (
                <div className="py-10 text-center text-red-600 font-black text-[14px]">
                  Sem dados durante este período
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(expenseByCategory).slice(0, 5).map(([cat, amount]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[13.5px] font-bold">
                        <span className="text-[#000000]">{cat}</span>
                        <span className="font-black text-red-700 tabular-nums">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#82af07] h-full"
                          style={{ width: `${Math.min(100, (amount / expenseTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div />
            </div>
          )}
        </div>

        {/* ROW 2 - RIGHT: PRÓXIMAS NÃO CONSOLIDADAS */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Próximas não consolidadas</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setProximasOpen(!proximasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {proximasOpen ? '-' : '+'}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {proximasOpen && (
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[#000000] font-black border-b border-[#bbbbbb] pb-1.5 text-[13px]">
                <span className="w-[48%]">Transações</span>
                <span className="w-[24%] text-center">Data</span>
                <span className="w-[28%] text-right pr-6">Valor (R$)</span>
              </div>

              {upcomingTxs.length === 0 ? (
                <div className="py-8 text-center text-red-600 font-black text-[14px]">
                  Nenhuma transação encontrada
                </div>
              ) : (
                <div className="space-y-1 text-[13.5px]">
                  {upcomingTxs.map((tx) => {
                    const isNeg = tx.amount < 0;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-1 hover:bg-gray-100 group border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-[48%] flex items-center gap-1.5 truncate text-[#000000] font-bold">
                          {tx.isRecurring && (
                            <span className="text-black text-[12px]">🕒</span>
                          )}
                          <span className="truncate">{tx.description}</span>
                        </div>

                        <div className="w-[24%] text-center text-[#000000] font-bold text-[13px]">
                          {formatDateShortYear(tx.date)}
                        </div>

                        <div className="w-[28%] flex items-center justify-end gap-2 tabular-nums">
                          <span className={isNeg ? 'text-[#dc2626] font-black text-[14px]' : 'text-[#15803d] font-black text-[14px]'}>
                            {formatSignedAmount(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onEditTransaction) {
                                onEditTransaction(tx);
                              } else {
                                onNavigateToTransactions();
                              }
                            }}
                            className="text-black hover:text-green-700 cursor-pointer p-0.5 text-[13px] font-bold"
                            title="Editar transação"
                          >
                            ✎
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ROW 3 - LEFT: SALDO DAS CONTAS (Interactive SVG Line Chart) */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Saldo das contas</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setSaldoContasOpen(!saldoContasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {saldoContasOpen ? '-' : '+'}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
                title="Expandir gráfico"
              >
                ⤢
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {saldoContasOpen && (
            <div className="p-3.5">
              <div className="relative h-44 w-full border-l-2 border-b-2 border-[#555555] bg-white">
                {/* Y-axis markings */}
                <div className="absolute -left-14 top-0 text-[11px] text-[#000000] font-bold">
                  R$ 1,00
                </div>
                <div className="absolute -left-14 bottom-0 text-[11px] text-[#000000] font-bold">
                  R$ 0,00
                </div>

                {/* SVG Chart Grid & Line */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Subtle vertical day grid lines */}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <line
                      key={i}
                      x1={`${(i / 30) * 100}%`}
                      y1="0"
                      x2={`${(i / 30) * 100}%`}
                      y2="100%"
                      stroke="#eeeeee"
                      strokeWidth="1"
                    />
                  ))}
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e0e0e0" strokeWidth="1" />
                  
                  {/* The teal line tracking balance evolution */}
                  <path
                    d="M 0 176 L 400 176"
                    stroke="#00b4a6"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* ROW 3 - RIGHT: PRÓXIMAS COM ALERTA */}
        <div className="bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Próximas com alerta</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setAlertasOpen(!alertasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {alertasOpen ? '-' : '+'}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {alertasOpen && (
            <div className="p-3 min-h-[140px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#000000] font-black border-b border-[#bbbbbb] pb-1.5 text-[12.5px]">
                <span className="w-1/2">Transações</span>
                <span className="w-1/4 text-center">Data</span>
                <span className="w-1/4 text-right">Valor (R$)</span>
              </div>

              <div className="py-10 text-center text-red-600 font-black text-[14px]">
                Nenhuma transação encontrada
              </div>
              <div />
            </div>
          )}
        </div>

        {/* ROW 4 - FULL WIDTH: ÚLTIMAS ALTERAÇÕES */}
        <div className="col-span-1 md:col-span-2 bg-white border border-[#b8b8b8] shadow-xs">
          <div className="bg-[#eeeeee] border-b border-[#cccccc] px-3 py-2 flex items-center justify-between">
            <span className="font-black text-[14.5px] text-[#000000]">Últimas alterações</span>
            <div className="flex items-center gap-1.5 text-[#000000]">
              <button
                onClick={() => setUltimasOpen(!ultimasOpen)}
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-black cursor-pointer"
              >
                {ultimasOpen ? '-' : '+'}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center border border-[#999] bg-[#ffffff] hover:bg-gray-200 text-[12px] font-bold cursor-pointer"
              >
                ?
              </button>
            </div>
          </div>

          {ultimasOpen && (
            <div className="p-3.5 text-[13px] space-y-2 text-[#000000] font-semibold">
              <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                <span>08/10/2026 14:52 - Criação de conta corrente</span>
                <span className="text-black font-bold">usuario@exemplo.com</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                <span>08/10/2026 14:48 - Inclusão de receita de exemplo</span>
                <span className="text-black font-bold">usuario@exemplo.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span>08/10/2026 14:30 - Ajuste de categorias e contas</span>
                <span className="text-black font-bold">usuario@exemplo.com</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
