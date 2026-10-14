import React, { useState } from 'react';
import { Category, Transaction } from '../types';
import { formatCurrency, MONTH_NAMES_PT } from '../utils/formatters';

interface OrcamentoViewProps {
  categories: Category[];
  transactions: Transaction[];
  selectedMonth: number;
  selectedYear: number;
}

export const OrcamentoView: React.FC<OrcamentoViewProps> = ({
  categories,
  transactions,
  selectedMonth,
  selectedYear,
}) => {
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES_PT[selectedMonth]}/${selectedYear}`;

  const [budgetStorage] = useState(() => {
    const defaults = {
      Alimentação: 1200,
      Moradia: 1500,
      Educação: 800,
      Saúde: 600,
      Transporte: 500,
      Lazer: 400,
    };
    try {
      const saved = localStorage.getItem('me_budgets_v1');
      if (saved === null) return { budgets: defaults, invalid: false, warning: '' };
      const parsed: unknown = JSON.parse(saved);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        !Object.values(parsed).every((amount) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0)
      ) {
        throw new Error('O formato dos orçamentos salvos é inválido.');
      }
      return { budgets: parsed as Record<string, number>, invalid: false, warning: '' };
    } catch (error) {
      console.error('Não foi possível carregar os orçamentos locais.', error);
      return {
        budgets: defaults,
        invalid: true,
        warning: 'Os orçamentos salvos não puderam ser lidos e foram preservados. Exporte ou corrija os dados locais antes de alterar os valores.',
      };
    }
  });
  const [budgetMap, setBudgetMap] = useState<Record<string, number>>(budgetStorage.budgets);
  const [budgetWarning, setBudgetWarning] = useState(budgetStorage.warning);

  React.useEffect(() => {
    if (budgetStorage.invalid) return;
    try {
      localStorage.setItem('me_budgets_v1', JSON.stringify(budgetMap));
      setBudgetWarning('');
    } catch (error) {
      console.error('Não foi possível salvar os orçamentos locais.', error);
      setBudgetWarning('Não foi possível salvar seus orçamentos neste navegador. Verifique o espaço disponível.');
    }
  }, [budgetMap, budgetStorage]);

  // Calculate actual expenses for month
  const spentMap: Record<string, number> = {};
  transactions
    .filter(
      (transaction) =>
        transaction.date.startsWith(monthKey) &&
        transaction.isConsolidated &&
        transaction.type === 'despesa'
    )
    .forEach(t => {
      spentMap[t.category] = (spentMap[t.category] || 0) + Math.abs(t.amount);
    });

  const expenseCategories = categories.filter(c => c.type === 'despesa' && c.name !== 'Sem Categoria' && c.name !== 'Transferência');

  return (
    <div className="flex-1 bg-white min-w-0 text-[14.5px] font-sans select-none space-y-4 text-[#000000]">
      {budgetWarning && <p role="alert" className="border border-amber-300 bg-amber-50 p-2 text-amber-900">{budgetWarning}</p>}
      <div className="flex items-center justify-between pb-2 border-b border-[#bbbbbb]">
        <div>
          <h2 className="text-[16px] font-black text-[#000000]">Orçamento Mensal - {monthLabel}</h2>
          <p className="text-[13px] text-[#000000] font-bold">
            Defina limites de gastos para cada categoria e evite surpresas no fim do mês.
          </p>
        </div>
      </div>

      <div className="border border-[#b8b8b8] bg-white overflow-x-auto">
        <table className="w-full text-left text-[14px] border-collapse">
          <thead>
            <tr className="bg-[#e8e8e8] border-b border-[#b8b8b8] font-black text-[#000000]">
              <th className="p-2.5 font-black">Categoria</th>
              <th className="p-2.5 text-right font-black">Planejado (R$)</th>
              <th className="p-2.5 text-right font-black">Realizado (R$)</th>
              <th className="p-2.5 text-right font-black">Diferença (R$)</th>
              <th className="p-2.5 w-48 text-center font-black">% Utilizado</th>
            </tr>
          </thead>
          <tbody>
            {expenseCategories.map(cat => {
              const budgeted = budgetMap[cat.name] || 0;
              const spent = spentMap[cat.name] || 0;
              const diff = budgeted - spent;
              const percent = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : (spent > 0 ? 100 : 0);
              const isOver = spent > budgeted && budgeted > 0;

              return (
                <tr key={cat.id} className="border-b border-gray-200 hover:bg-[#f9fdf2]">
                  <td className="p-2.5 font-bold text-[#000000]">{cat.name}</td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      value={budgetMap[cat.name] || ''}
                      placeholder="0,00"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBudgetMap(prev => ({ ...prev, [cat.name]: val }));
                      }}
                      className="w-28 text-right border border-[#888888] px-1.5 py-1 text-[13.5px] font-black text-[#000000] rounded-xs"
                    />
                  </td>
                  <td className="p-2.5 text-right font-black text-[#000000] tabular-nums">
                    {formatCurrency(spent)}
                  </td>
                  <td className={`p-2.5 text-right font-black tabular-nums ${diff < 0 ? 'text-red-700' : 'text-green-800'}`}>
                    {formatCurrency(diff)}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isOver ? 'bg-red-600' : 'bg-[#82af07]'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[12px] text-[#000000] font-black">{percent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
