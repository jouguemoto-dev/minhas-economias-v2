import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { Trash2 } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
  initialType?: Account['type'];
  onSaveAccount: (accountData: {
    id?: string;
    name: string;
    type: Account['type'];
    initialBalance: number;
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
  }) => void;
  onDeleteAccount?: (id: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
  initialType = 'corrente',
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('corrente');
  const [initialBalance, setInitialBalance] = useState('0,00');
  const [creditLimit, setCreditLimit] = useState('0,00');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setInitialBalance(
        (accountToEdit.initialBalance || 0).toFixed(2).replace('.', ',')
      );
      setCreditLimit((accountToEdit.creditLimit || 0).toFixed(2).replace('.', ','));
      setClosingDay(accountToEdit.closingDay?.toString() ?? '');
      setDueDay(accountToEdit.dueDay?.toString() ?? '');
    } else {
      setName('');
      setType(initialType);
      setInitialBalance('0,00');
      setCreditLimit('0,00');
      setClosingDay('');
      setDueDay('');
    }
  }, [accountToEdit, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da conta.');
      return;
    }
    const balanceNum = parseFloat(initialBalance.replace(/\./g, '').replace(',', '.')) || 0;
    const creditLimitNum = parseFloat(creditLimit.replace(/\./g, '').replace(',', '.')) || 0;
    const closingDayNum = Number(closingDay);
    const dueDayNum = Number(dueDay);
    if (type === 'cartao') {
      if (creditLimitNum < 0) {
        alert('O limite do cartão não pode ser negativo.');
        return;
      }
      if (closingDay && (!Number.isInteger(closingDayNum) || closingDayNum < 1 || closingDayNum > 31)) {
        alert('Informe um dia de fechamento entre 1 e 31.');
        return;
      }
      if (dueDay && (!Number.isInteger(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)) {
        alert('Informe um dia de vencimento entre 1 e 31.');
        return;
      }
    }
    onSaveAccount({
      id: accountToEdit?.id,
      name: name.trim().toUpperCase(),
      type,
      initialBalance: balanceNum,
      creditLimit: type === 'cartao' ? creditLimitNum : undefined,
      closingDay: type === 'cartao' && closingDay ? closingDayNum : undefined,
      dueDay: type === 'cartao' && dueDay ? dueDayNum : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!accountToEdit || !onDeleteAccount) return;
    if (confirm(`Deseja realmente excluir a conta "${accountToEdit.name}"? As transações associadas a ela serão mantidas como sem conta.`)) {
      onDeleteAccount(accountToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border-2 border-[#555555] shadow-2xl w-full max-w-[470px] text-[14.5px] text-[#000000] rounded-xs font-sans">
        {/* Title Bar */}
        <div className="bg-[#eeeeee] border-b border-[#cccccc] px-4 py-2.5 flex items-center justify-between">
          <span className="font-black text-[15.5px] text-[#000000]">
            {accountToEdit ? `Editar Conta: ${accountToEdit.name}` : 'Adicionar Nova Conta'}
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center border border-[#888] bg-white hover:bg-gray-100 text-[13px] font-black cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4.5 space-y-4">
          <div className="space-y-1">
            <label className="font-black text-[#000000] text-[13.5px]">Nome da Conta:</label>
            <input
              type="text"
              placeholder="Ex: NUBANK, BANCO DO BRASIL, CARTEIRA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#888888] text-[14px] font-bold text-[#000000] focus:outline-none focus:border-[#73a000] bg-white"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-black text-[#000000] text-[13.5px]">Tipo de Conta:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-[#888888] text-[14px] font-bold text-[#000000] focus:outline-none bg-white cursor-pointer"
            >
              <option value="corrente">Conta Corrente</option>
              <option value="carteira">Carteira / Dinheiro</option>
              <option value="cartao">Cartão de Crédito</option>
              <option value="poupanca">Poupança</option>
              <option value="investimento">Investimentos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-black text-[#000000] text-[13.5px]">Saldo Inicial (R$):</label>
            <input
              type="text"
              placeholder="0,00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#888888] text-[14.5px] focus:outline-none bg-white text-right font-black text-[#000000]"
            />
          </div>

          {type === 'cartao' && (
            <div className="space-y-3 rounded-xs border border-[#d4dfb4] bg-[#f8faF2] p-3">
              <h3 className="font-black text-[13.5px] text-[#385500]">Dados do cartão de crédito</h3>
              <div className="space-y-1">
                <label htmlFor="credit-limit" className="font-black text-[#000000] text-[13px]">
                  Limite total (R$):
                </label>
                <input
                  id="credit-limit"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#888888] text-[14px] focus:outline-none bg-white text-right font-bold text-[#000000]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="closing-day" className="font-black text-[#000000] text-[13px]">
                    Dia de fechamento:
                  </label>
                  <input
                    id="closing-day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex.: 10"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#888888] text-[14px] focus:outline-none bg-white text-[#000000]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="due-day" className="font-black text-[#000000] text-[13px]">
                    Dia de vencimento:
                  </label>
                  <input
                    id="due-day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex.: 17"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#888888] text-[14px] focus:outline-none bg-white text-[#000000]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#cccccc]">
            {accountToEdit && onDeleteAccount ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-black border border-red-300 rounded-xs text-[13px] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-[#888] bg-gradient-to-b from-[#fff] to-[#e8e8e8] text-[#000000] font-black rounded-xs cursor-pointer text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-[#5a8710] hover:bg-[#4d740c] text-white font-black rounded-xs border border-[#446609] cursor-pointer text-[13px] shadow-xs"
              >
                {accountToEdit ? 'Atualizar' : 'Criar Conta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
