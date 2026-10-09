import React from 'react';
import { Transaction, Category } from '../types';
import { formatCurrency, MONTH_NAMES_PT } from '../utils/formatters';

interface AnaliseViewProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
  subType?: 'categorias' | 'evolucao' | 'fluxo';
}

export const AnaliseView: React.FC<AnaliseViewProps> = ({
  transactions,
  categories,
  selectedMonth,
  selectedYear,
  subType = 'categorias',
}) => {
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES_PT[selectedMonth]}/${selectedYear}`;

  const currentTxs = transactions.filter(t => t.date.startsWith(monthKey));
  const expenses = currentTxs.filter(t => t.amount < 0);
  const incomes = currentTxs.filter(t => t.amount > 0);

  const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);

  // Group by category
  const catExpenses: Record<string, number> = {};
  expenses.forEach(t => {
    catExpenses[t.category] = (catExpenses[t.category] || 0) + Math.abs(t.amount);
  });

  const sortedCategories = Object.entries(catExpenses).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex-1 bg-white min-w-0 text-[14.5px] font-sans select-none space-y-4 text-[#000000]">
      <div className="pb-2 border-b border-[#bbbbbb]">
        <h2 className="text-[16px] font-black text-[#000000]">Relatórios e Análises - {monthLabel}</h2>
        <p className="text-[13px] text-[#000000] font-bold">
          Visão gráfica detalhada da distribuição das suas receitas e despesas.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-[#b8b8b8] p-3.5 bg-[#fafafa]">
          <div className="text-[#000000] text-[12px] font-black uppercase tracking-wide">Total de Receitas</div>
          <div className="text-[22px] font-black text-green-700 mt-1 tabular-nums">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="border-2 border-[#b8b8b8] p-3.5 bg-[#fafafa]">
          <div className="text-[#000000] text-[12px] font-black uppercase tracking-wide">Total de Despesas</div>
          <div className="text-[22px] font-black text-red-600 mt-1 tabular-nums">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="border-2 border-[#b8b8b8] p-3.5 bg-[#fafafa]">
          <div className="text-[#000000] text-[12px] font-black uppercase tracking-wide">Resultado do Mês</div>
          <div className={`text-[22px] font-black mt-1 tabular-nums ${totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </div>
        </div>
      </div>

      {/* Detailed breakdown list */}
      <div className="border-2 border-[#b8b8b8] bg-white p-4">
        <h3 className="font-black text-[14px] text-[#000000] mb-3">Distribuição de Despesas por Categoria</h3>
        {sortedCategories.length === 0 ? (
          <div className="py-6 text-center text-red-600 font-black text-[14px]">Sem dados durante este período</div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map(([cat, val]) => {
              const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between font-bold text-[13.5px]">
                    <span className="text-[#000000]">{cat}</span>
                    <span className="tabular-nums font-black text-[#000000]">
                      {formatCurrency(val)} <span className="text-[#333333] font-bold">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#82af07] h-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
