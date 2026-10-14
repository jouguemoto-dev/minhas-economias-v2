import React, { useEffect, useState } from 'react';
import { Account, AutoCategoryRule, Category } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Trash2, Plus, Edit2, Smartphone, Check } from 'lucide-react';
import { createId } from '../lib/persistence';

interface ConfiguracoesViewProps {
  initialSubTab: 'contas' | 'categorias' | 'regras' | 'app';
  accounts: Account[];
  categories: Category[];
  onAddCategory: (cat: Category) => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onOpenNewAccountModal: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  rules: AutoCategoryRule[];
  onAddRule: (rule: AutoCategoryRule) => void;
  onDeleteRule: (id: string) => void;
  isInstalled: boolean;
  isInstallable: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  onOpenInstallModal: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  initialSubTab,
  accounts,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onOpenNewAccountModal,
  onEditAccount,
  onDeleteAccount,
  rules,
  onAddRule,
  onDeleteRule,
  isInstalled,
  isInstallable,
  isAndroid,
  isIOS,
  onOpenInstallModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'despesa' | 'receita'>('despesa');
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleAccount, setRuleAccount] = useState('');

  useEffect(() => setActiveSubTab(initialSubTab), [initialSubTab]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType,
    });
    setNewCatName('');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleKeyword.trim() || !ruleCategory) return;
    onAddRule({
      id: createId('rule'),
      keyword: ruleKeyword.trim(),
      category: ruleCategory,
      account: ruleAccount || undefined,
    });
    setRuleKeyword('');
    setRuleAccount('');
  };

  const categoryOptions = categories.flatMap((category) => [
    category.name,
    ...(category.subcategories ?? []),
  ]);

  return (
    <div className="flex-1 bg-white min-w-0 text-[14.5px] font-sans select-none space-y-4 text-[#000000]">
      <div className="pb-2 border-b border-[#bbbbbb] flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-[16px] font-black text-[#000000]">Configurações do Sistema</h2>
          <p className="text-[13px] text-[#000000] font-bold">Gerencie suas contas, plano de categorias e regras automáticas.</p>
        </div>

        {/* Subtabs */}
        <div className="flex border-2 border-[#888888] rounded-xs overflow-hidden">
          <button
            onClick={() => setActiveSubTab('contas')}
            className={`px-4 py-1.5 text-[13.5px] font-black cursor-pointer ${
              activeSubTab === 'contas' ? 'bg-[#577708] text-white' : 'bg-gray-100 text-[#000000] hover:bg-gray-200'
            }`}
          >
            Contas
          </button>
          <button
            onClick={() => setActiveSubTab('categorias')}
            className={`px-4 py-1.5 text-[13.5px] font-black cursor-pointer ${
              activeSubTab === 'categorias' ? 'bg-[#577708] text-white' : 'bg-gray-100 text-[#000000] hover:bg-gray-200'
            }`}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveSubTab('regras')}
            className={`px-4 py-1.5 text-[13.5px] font-black cursor-pointer ${
              activeSubTab === 'regras' ? 'bg-[#577708] text-white' : 'bg-gray-100 text-[#000000] hover:bg-gray-200'
            }`}
          >
            Regras
          </button>
          <button
            onClick={() => setActiveSubTab('app')}
            className={`px-4 py-1.5 text-[13.5px] font-black cursor-pointer ${
              activeSubTab === 'app' ? 'bg-[#577708] text-white' : 'bg-gray-100 text-[#000000] hover:bg-gray-200'
            }`}
          >
            Aplicativo
          </button>
        </div>
      </div>

      {activeSubTab === 'contas' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-black text-[14.5px] text-[#000000]">Contas Cadastradas ({accounts.length})</span>
            <button
              onClick={onOpenNewAccountModal}
              className="bg-[#5a8710] hover:bg-[#4d740c] text-white px-4 py-1.5 font-black rounded-xs text-[13px] cursor-pointer"
            >
              + Nova Conta
            </button>
          </div>

          <div className="border border-[#b8b8b8] bg-white">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#e8e8e8] border-b border-[#b8b8b8] font-black text-[#000000]">
                  <th className="p-2.5 font-black">Nome</th>
                  <th className="p-2.5 font-black">Tipo</th>
                  <th className="p-2.5 text-right font-black">Saldo Atual</th>
                  <th className="p-2.5 text-center w-24 font-black">Ações</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} className="border-b border-gray-200 hover:bg-[#f9f9f9] group">
                    <td className="p-2.5 font-black text-[#000000]">{acc.name}</td>
                    <td className="p-2.5 text-[#000000] capitalize font-bold">{acc.type}</td>
                    <td className="p-2.5 text-right font-black tabular-nums text-[#000000]">{formatCurrency(acc.balance)}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditAccount(acc)}
                          className="text-[#000000] hover:text-[#5a8710] font-black p-0.5 cursor-pointer text-[14px]"
                          title="Editar conta"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir conta "${acc.name}"?`)) {
                              onDeleteAccount(acc.id);
                            }
                          }}
                          className="text-[#000000] hover:text-red-700 font-black p-0.5 cursor-pointer text-[14px]"
                          title="Excluir conta"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'categorias' && (
        <div className="space-y-3">
          <form onSubmit={handleCreateCategory} className="flex items-center gap-2 bg-[#f4f4f4] p-3 border border-[#b8b8b8]">
            <input
              type="text"
              placeholder="Nova Categoria..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="border border-[#888888] px-3 py-1.5 text-[14px] font-black text-[#000000] flex-1 bg-white"
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as any)}
              className="border border-[#888888] px-3 py-1.5 text-[14px] font-black text-[#000000] bg-white"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
            <button
              type="submit"
              className="bg-[#5a8710] hover:bg-[#4d740c] text-white px-4 py-1.5 font-black text-[13.5px] rounded-xs cursor-pointer"
            >
              Adicionar
            </button>
          </form>

          <div className="border border-[#b8b8b8] bg-white max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
              {categories.map(cat => (
                <div key={cat.id} className="p-2.5 border border-[#cccccc] bg-[#fafafa] flex items-center justify-between group">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-black text-[#000000] truncate text-[14px]">{cat.name}</span>
                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded shrink-0 ${cat.type === 'receita' ? 'bg-green-100 text-green-950' : 'bg-red-100 text-red-950'}`}>
                      {cat.type}
                    </span>
                  </div>

                  {cat.name !== 'Sem Categoria' && cat.name !== 'Transferência' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className="text-[#000000] hover:text-[#5a8710] font-black p-0.5 cursor-pointer text-[13px]"
                        title="Editar categoria"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir categoria "${cat.name}"?`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        className="text-[#000000] hover:text-red-700 font-black p-0.5 cursor-pointer text-[13px]"
                        title="Excluir categoria"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'regras' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-black text-[15px]">Regras de categorização automática</h3>
            <p className="text-sm text-gray-700">Ao adicionar ou importar lançamentos, uma descrição que contenha a palavra-chave aplica a categoria e, opcionalmente, a conta escolhida.</p>
          </div>
          <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-4 gap-2 border border-[#b8b8b8] bg-[#f8f8f8] p-3">
            <input
              value={ruleKeyword}
              onChange={(event) => setRuleKeyword(event.target.value)}
              placeholder="Palavra-chave, ex.: UBER"
              aria-label="Palavra-chave da regra"
              className="border border-[#888] bg-white px-2 py-2"
              required
            />
            <select
              value={ruleCategory}
              onChange={(event) => setRuleCategory(event.target.value)}
              aria-label="Categoria da regra"
              className="border border-[#888] bg-white px-2 py-2"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categoryOptions.map((category, index) => <option key={`${category}-${index}`} value={category}>{category}</option>)}
            </select>
            <select
              value={ruleAccount}
              onChange={(event) => setRuleAccount(event.target.value)}
              aria-label="Conta da regra"
              className="border border-[#888] bg-white px-2 py-2"
            >
              <option value="">Manter conta escolhida</option>
              {accounts.map((account) => <option key={account.id} value={account.name}>{account.name}</option>)}
            </select>
            <button type="submit" className="bg-[#5a8710] px-3 py-2 font-bold text-white">Adicionar regra</button>
          </form>
          {rules.length === 0 ? (
            <p className="border border-dashed border-gray-400 p-4 text-center text-gray-700">Nenhuma regra cadastrada.</p>
          ) : (
            <ul className="divide-y border border-[#b8b8b8]">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between gap-3 p-3">
                  <span><strong>Se contiver “{rule.keyword}”</strong>, usar <strong>{rule.category}</strong>{rule.account ? ` na conta ${rule.account}` : ''}</span>
                  <button type="button" onClick={() => onDeleteRule(rule.id)} aria-label={`Excluir regra ${rule.keyword}`} className="text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeSubTab === 'app' && (
        <section className="max-w-xl space-y-3 border border-[#b8b8b8] bg-[#fafafa] p-5">
          <Smartphone className="h-8 w-8 text-[#82af07]" />
          <h3 className="font-black text-[15px]">Instalação do aplicativo</h3>
          <p className="text-sm text-gray-700">
            {isInstalled
              ? 'O Minhas Economias já está instalado neste dispositivo.'
              : isInstallable
                ? 'Instale o aplicativo para acesso rápido e uso offline.'
                : isIOS
                  ? 'No iPhone ou iPad, use Compartilhar e escolha “Adicionar à Tela de Início”.'
                  : isAndroid
                    ? 'Se o navegador oferecer a instalação, ela estará disponível aqui. Você também pode usar o menu do navegador e escolher “Instalar app”.'
                    : 'A instalação fica disponível quando o navegador compatível oferecer o aplicativo.'}
          </p>
          {isInstalled ? (
            <span className="inline-flex items-center gap-2 font-bold text-green-800"><Check className="h-4 w-4" /> Instalado</span>
          ) : (
            <button type="button" onClick={onOpenInstallModal} className="bg-[#5a8710] px-4 py-2 font-bold text-white">
              {isInstallable ? 'Instalar aplicativo' : 'Ver instruções de instalação'}
            </button>
          )}
        </section>
      )}
    </div>
  );
};
