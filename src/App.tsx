import React, { useState, useEffect } from 'react';
import { Account, Category, Transaction, Dream } from './types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_DREAMS,
} from './data/initialData';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { SonhosView } from './components/SonhosView';
import { OrcamentoView } from './components/OrcamentoView';
import { AnaliseView } from './components/AnaliseView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { ExportModal } from './components/ExportModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { AccountModal } from './components/AccountModal';
import { CategoryModal } from './components/CategoryModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { InstallAndroidModal } from './components/InstallAndroidModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Wallet, X, Sparkles } from 'lucide-react';
import { formatCurrency } from './utils/formatters';
import { ImportTransactionsModal } from './components/ImportTransactionsModal';
import { AutoCategoryRule } from './types';
import {
  createId,
  formatDateInput,
  getAccountTransactionImpact,
  getCurrentDateInputValue,
  getYearOptions,
  loadInitialFinanceData,
} from './lib/persistence';

export default function App() {
  const [initialData] = useState(loadInitialFinanceData);
  const [storageWarning, setStorageWarning] = useState(initialData.warning);
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('inicio');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [accounts, setAccounts] = useState<Account[]>(initialData.accounts);
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
  const [dreams, setDreams] = useState<Dream[]>(initialData.dreams);
  const [rules, setRules] = useState<AutoCategoryRule[]>(initialData.rules);

  // Filters state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() =>
    initialData.accounts.map((account) => account.id)
  );
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const values: Record<string, unknown> = {
      me_accounts_v1: accounts,
      me_categories_v1: categories,
      me_transactions_v1: transactions,
      me_dreams_v1: dreams,
      me_rules_v1: rules,
    };
    const failedKeys: string[] = [];
    Object.entries(values).forEach(([key, value]) => {
      if (initialData.invalidKeys.includes(key)) return;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Não foi possível salvar os dados locais "${key}".`, error);
        failedKeys.push(key);
      }
    });
    const warnings = [
      initialData.warning,
      failedKeys.length
        ? `Não foi possível salvar: ${failedKeys.join(', ')}. Exporte seus dados e verifique o espaço disponível no navegador.`
        : '',
    ].filter(Boolean);
    setStorageWarning(warnings.join(' '));
  }, [accounts, categories, transactions, dreams, rules, initialData]);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [exportError, setExportError] = useState('');
  const today = getCurrentDateInputValue();
  const [pdfConfig, setPdfConfig] = useState({
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
    orientation: 'portrait' as 'portrait' | 'landscape',
  });

  // Account Modal (Create & Edit)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [newAccountType, setNewAccountType] = useState<Account['type']>('corrente');

  // Category Modal (Create & Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Transaction Edit Modal
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // PWA Install State & Hook for Android and mobile devices
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleSelectMonthYear = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Compute calculated balances for each account
  const accountsWithBalances: Account[] = accounts.map((acc) => {
    const sum = transactions
      .filter((transaction) => transaction.isConsolidated)
      .reduce((total, transaction) => total + getAccountTransactionImpact(transaction, acc.name), 0);
    return {
      ...acc,
      balance: acc.initialBalance + sum,
    };
  });

  // Total current balance across selected accounts
  const totalCurrentBalance = accountsWithBalances
    .filter((account) => selectedAccountIds.includes(account.id))
    .reduce((total, a) => total + a.balance, 0);

  // Left sidebar account selection
  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleClearAccounts = () => setSelectedAccountIds([]);
  const handleSelectAllAccounts = () =>
    setSelectedAccountIds(accounts.map((a) => a.id));

  // Category filter selection
  const handleToggleCategory = (catName: string) => {
    setSelectedCategoryNames((prev) =>
      prev.includes(catName)
        ? prev.filter((x) => x !== catName)
        : [...prev, catName]
    );
  };

  // ==========================================
  // CRUD LANÇAMENTOS (TRANSACTIONS)
  // ==========================================
  const handleAddTransaction = (
    txData: Omit<Transaction, 'id'>,
    installmentsCount = 1
  ) => {
    const transactionData = {
      ...txData,
      amount: txData.type === 'transferencia' ? -Math.abs(txData.amount) : txData.amount,
    };

    if (installmentsCount > 1) {
      const newTxs: Transaction[] = [];
      const [yearStr, monthStr, dayStr] = transactionData.date.split('-');
      let currentYear = parseInt(yearStr);
      let currentMonth = parseInt(monthStr);

      for (let i = 1; i <= installmentsCount; i++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dayStr}`;
        newTxs.push({
          ...transactionData,
          id: createId('tx'),
          date: dateStr,
          description: `${transactionData.description} (${i} / ${installmentsCount})`,
          recurrenceText: `${i} / ${installmentsCount}`,
          isRecurring: true,
        });

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      setTransactions((prev) => [...newTxs, ...prev]);
    } else {
      const newTx: Transaction = {
        ...transactionData,
        id: createId('tx'),
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleAddRule = (rule: AutoCategoryRule) => {
    setRules((previous) => {
      const matchingIndex = previous.findIndex(
        (item) => item.keyword.toLocaleLowerCase() === rule.keyword.toLocaleLowerCase()
      );
      if (matchingIndex < 0) return [...previous, rule];
      return previous.map((item, index) =>
        index === matchingIndex ? { ...rule, id: item.id } : item
      );
    });
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    setTransactions((previous) => [...imported, ...previous]);
    setImportStatus(`${imported.length} lançamento(s) importado(s) com sucesso.`);
    setIsImportModalOpen(false);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
    setIsEditTxModalOpen(true);
  };

  const handleSaveEditedTransaction = (updatedTx: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );
    setIsEditTxModalOpen(false);
    setTxToEdit(null);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteTransactions = (ids: string[]) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
  };

  const handleToggleConsolidate = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isConsolidated: !t.isConsolidated } : t
      )
    );
  };

  const handleBatchConsolidate = (ids: string[], status: boolean) => {
    setTransactions((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, isConsolidated: status } : t))
    );
  };

  const handleBatchChangeCategory = (ids: string[], newCat: string) => {
    setTransactions((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, category: newCat } : t))
    );
  };

  // ==========================================
  // CRUD CONTAS (ACCOUNTS)
  // ==========================================
  const handleOpenNewAccount = (type: Account['type'] = 'corrente') => {
    setAccountToEdit(null);
    setNewAccountType(type);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setAccountToEdit(acc);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (accountData: {
    id?: string;
    name: string;
    type: Account['type'];
    initialBalance: number;
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
  }) => {
    if (accountData.id) {
      // Edit existing account
      const oldAccount = accounts.find((a) => a.id === accountData.id);
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountData.id
            ? {
                ...a,
                name: accountData.name,
                type: accountData.type,
                initialBalance: accountData.initialBalance,
                creditLimit: accountData.creditLimit,
                closingDay: accountData.closingDay,
                dueDay: accountData.dueDay,
              }
            : a
        )
      );

      // If name changed, rename in associated transactions
      if (oldAccount && oldAccount.name !== accountData.name) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.account === oldAccount.name || t.toAccount === oldAccount.name
              ? {
                  ...t,
                  account: t.account === oldAccount.name ? accountData.name : t.account,
                  toAccount: t.toAccount === oldAccount.name ? accountData.name : t.toAccount,
                }
              : t
          )
        );
        setRules((previous) =>
          previous.map((rule) =>
            rule.account === oldAccount.name ? { ...rule, account: accountData.name } : rule
          )
        );
      }
    } else {
      // Create new account
      const created: Account = {
        id: `acc-${Date.now()}`,
        name: accountData.name,
        type: accountData.type,
        initialBalance: accountData.initialBalance,
        balance: accountData.initialBalance,
        isChecked: true,
        creditLimit: accountData.creditLimit,
        closingDay: accountData.closingDay,
        dueDay: accountData.dueDay,
      };
      setAccounts((prev) => [...prev, created]);
      setSelectedAccountIds((prev) => [...prev, created.id]);
    }
  };

  const handleDeleteAccount = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccountIds((prev) => prev.filter((accId) => accId !== id));

    // Remove or detach from transactions
    if (acc) {
      setTransactions((prev) =>
        prev.map((transaction) => ({
          ...transaction,
          account: transaction.account === acc.name ? 'Sem Conta' : transaction.account,
          toAccount: transaction.toAccount === acc.name ? undefined : transaction.toAccount,
        }))
      );
      setRules((previous) =>
        previous.map((rule) =>
          rule.account === acc.name ? { ...rule, account: undefined } : rule
        )
      );
    }
  };

  // ==========================================
  // CRUD CATEGORIAS (CATEGORIES)
  // ==========================================
  const handleOpenNewCategory = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (catData: {
    id?: string;
    name: string;
    type: 'despesa' | 'receita';
    parentCategoryName?: string;
  }) => {
    if (catData.id) {
      // Edit existing category
      const oldCat = categories.find((c) => c.id === catData.id);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catData.id
            ? { ...c, name: catData.name, type: catData.type }
            : c
        )
      );

      // If name changed, rename in transactions
      if (oldCat && oldCat.name !== catData.name) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.category === oldCat.name ? { ...t, category: catData.name } : t
          )
        );
        setRules((previous) =>
          previous.map((rule) =>
            rule.category === oldCat.name ? { ...rule, category: catData.name } : rule
          )
        );
      }
    } else if (catData.parentCategoryName) {
      // Add as subcategory to existing parent
      setCategories((prev) =>
        prev.map((c) => {
          if (c.name === catData.parentCategoryName) {
            const subs = c.subcategories || [];
            return {
              ...c,
              subcategories: subs.includes(catData.name) ? subs : [...subs, catData.name],
            };
          }
          return c;
        })
      );
    } else {
      // Create top-level category
      const created: Category = {
        id: createId('cat'),
        name: catData.name,
        type: catData.type,
      };
      setCategories((prev) => [...prev, created]);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (cat) {
      const removedNames = new Set([cat.name, ...(cat.subcategories ?? [])]);
      setSelectedCategoryNames((prev) => prev.filter((name) => !removedNames.has(name)));
      setRules((previous) =>
        previous.map((rule) =>
          removedNames.has(rule.category) ? { ...rule, category: 'Sem Categoria' } : rule
        )
      );
      // Point affected transactions to 'Sem Categoria'
      setTransactions((prev) =>
        prev.map((t) =>
          removedNames.has(t.category) ? { ...t, category: 'Sem Categoria' } : t
        )
      );
    }
  };

  // Export Modal Confirm
  const handleConfirmExport = async (config: {
    startDate: string;
    endDate: string;
    format: 'pdf' | 'xls';
    orientation: 'portrait' | 'landscape';
  }) => {
    if (config.startDate > config.endDate) {
      alert('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setIsExportModalOpen(false);
    if (config.format === 'pdf') {
      setPdfConfig({
        startDate: config.startDate,
        endDate: config.endDate,
        orientation: config.orientation,
      });
      setIsPdfPreviewOpen(true);
    } else {
      try {
        const XLSX = await import('@e965/xlsx');
        const filtered = transactions.filter(
          (t) => t.date >= config.startDate && t.date <= config.endDate
        );
        const worksheet = XLSX.utils.json_to_sheet(filtered.map((transaction) => ({
          Data: transaction.date,
          Descrição: transaction.description,
          Categoria: transaction.category,
          Conta: transaction.account,
          Tipo: transaction.type,
          'Conta de destino': transaction.toAccount ?? '',
          'Valor (R$)': transaction.amount,
          Status: transaction.isConsolidated ? 'Consolidada' : 'Pendente',
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
        const excel = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excel], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Extrato_${config.startDate}_${config.endDate}.xlsx`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExportError('');
      } catch (error) {
        console.error('Não foi possível gerar a planilha Excel.', error);
        setExportError('Não foi possível gerar a planilha. Tente novamente ou exporte em PDF.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#000000] flex flex-col font-sans text-[14.5px] antialiased">
      {/* 1. TOP HEADER */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenExportModal={() => {
          setExportError('');
          setIsExportModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {storageWarning && (
        <div role="alert" className="border-b border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          {storageWarning}
        </div>
      )}
      {importStatus && (
        <div role="status" className="border-b border-green-300 bg-green-50 px-4 py-2 text-sm text-green-900 flex justify-between">
          <span>{importStatus}</span>
          <button type="button" onClick={() => setImportStatus('')} aria-label="Dispensar aviso">✕</button>
        </div>
      )}
      {exportError && (
        <div role="alert" className="border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900">
          {exportError}
        </div>
      )}

      {/* 2. MAIN CONTAINER (Responsive for Mobile, Android, Tablets and Desktop) */}
      <main className="flex-1 max-w-[1340px] w-full mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 items-start pb-20 lg:pb-6">
        {/* Mobile Filter / Accounts Bar Toggle (Visible only on < lg screens) */}
        <div className="lg:hidden w-full bg-white border border-[#b8b8b8] rounded-xs p-2.5 shadow-xs">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="w-full flex items-center justify-between text-[13.5px] font-bold text-[#000000] cursor-pointer"
          >
            <div className="flex items-center gap-2 text-left truncate">
              <Wallet className="w-4 h-4 text-[#82af07] shrink-0" />
              <span className="truncate">Contas ({selectedAccountIds.length})</span>
              <span className="text-[#82af07] font-black truncate">Saldo: {formatCurrency(totalCurrentBalance)}</span>
            </div>
            <span className="text-[12px] bg-[#eeeeee] border border-[#cccccc] px-2 py-0.5 rounded-xs shrink-0 ml-2 font-black">
              {isMobileSidebarOpen ? 'Ocultar ▲' : 'Filtrar ▼'}
            </span>
          </button>
        </div>

        {/* Left Sidebar (Contas / Busca Rápida / Categorias) */}
        <div className={`${isMobileSidebarOpen ? 'block' : 'hidden lg:block'} w-full lg:w-[268px] shrink-0`}>
          <LeftSidebar
            activeTab={activeTab}
            accounts={accountsWithBalances}
            categories={categories}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={handleToggleAccount}
            onClearAccounts={handleClearAccounts}
            onSelectAllAccounts={handleSelectAllAccounts}
            onOpenNewAccountModal={handleOpenNewAccount}
            onEditAccount={handleOpenEditAccount}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategories={selectedCategoryNames}
            onToggleCategory={handleToggleCategory}
            onOpenNewCategoryModal={handleOpenNewCategory}
            onEditCategory={handleOpenEditCategory}
            totalCurrentBalance={totalCurrentBalance}
          />
        </div>

        {/* Dynamic Center / Right Content based on active tab */}
        <div className="flex-1 min-w-0 bg-white border border-[#cccccc] p-2.5 sm:p-3 shadow-xs w-full">
          {activeTab === 'inicio' && (
            <DashboardView
              transactions={transactions}
              accounts={accountsWithBalances}
              categories={categories}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onSelectMonthYear={handleSelectMonthYear}
              onAddTransaction={handleAddTransaction}
              rules={rules}
              onCreateRule={handleAddRule}
              onEditTransaction={handleOpenEditTransaction}
              onNavigateToTransactions={() => handleTabChange('transacoes')}
            />
          )}

          {activeTab === 'transacoes' && (
            <TransactionsView
              transactions={transactions}
              accounts={accountsWithBalances}
              categories={categories}
              selectedAccountIds={selectedAccountIds}
              selectedCategoryNames={selectedCategoryNames}
              searchQuery={searchQuery}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onSelectMonthYear={handleSelectMonthYear}
              onAddTransaction={handleAddTransaction}
              rules={rules}
              onCreateRule={handleAddRule}
              onDeleteTransactions={handleDeleteTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onToggleConsolidate={handleToggleConsolidate}
              onBatchConsolidate={handleBatchConsolidate}
              onBatchChangeCategory={handleBatchChangeCategory}
              onOpenExportModal={() => {
                setExportError('');
                setIsExportModalOpen(true);
              }}
            />
          )}

          {activeTab === 'sonhos' && (
            <SonhosView
              dreams={dreams}
              onAddDream={(newDream) =>
                setDreams((prev) => [...prev, { ...newDream, id: `dr-${Date.now()}` }])
              }
              onUpdateDream={(id, amount) =>
                setDreams((prev) =>
                  prev.map((d) => (d.id === id ? { ...d, currentAmount: amount } : d))
                )
              }
            />
          )}

          {activeTab === 'orcamento' && (
            <OrcamentoView
              categories={categories}
              transactions={transactions}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}

          {activeTab.startsWith('analise') && (
            <AnaliseView
              transactions={transactions}
              categories={categories}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}

          {activeTab.startsWith('config') && (
            <ConfiguracoesView
              initialSubTab={
                activeTab === 'config-categorias'
                  ? 'categorias'
                  : activeTab === 'config-regras'
                    ? 'regras'
                    : activeTab === 'config-app'
                      ? 'app'
                      : 'contas'
              }
              accounts={accountsWithBalances}
              categories={categories}
              onAddCategory={(cat) => setCategories((prev) => [...prev, cat])}
              onEditCategory={handleOpenEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onOpenNewAccountModal={handleOpenNewAccount}
              onEditAccount={handleOpenEditAccount}
              onDeleteAccount={handleDeleteAccount}
              rules={rules}
              onAddRule={handleAddRule}
              onDeleteRule={(id) => setRules((previous) => previous.filter((rule) => rule.id !== id))}
              isInstalled={isInstalled}
              isInstallable={isInstallable}
              isAndroid={isAndroid}
              isIOS={isIOS}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* 3. MODALS */}
      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={isEditTxModalOpen}
        onClose={() => {
          setIsEditTxModalOpen(false);
          setTxToEdit(null);
        }}
        transaction={txToEdit}
        accounts={accountsWithBalances}
        categories={categories}
        onSave={handleSaveEditedTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Account Creation & Edit Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        accountToEdit={accountToEdit}
        initialType={newAccountType}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Category Creation & Edit Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
        allCategories={categories}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Export Options Modal (Image 5) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleConfirmExport}
        defaultStartDate={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`}
        defaultEndDate={formatDateInput(
          selectedYear,
          selectedMonth,
          new Date(selectedYear, selectedMonth + 1, 0).getDate()
        )}
      />

      <ImportTransactionsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        accounts={accounts}
        categories={categories}
        rules={rules}
        transactions={transactions}
        onImport={handleImportTransactions}
      />

      {/* Authentic PDF Viewer / Print Preview Modal (Images 6 & 7) */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        transactions={transactions}
        accounts={accounts}
        startDate={pdfConfig.startDate}
        endDate={pdfConfig.endDate}
        orientation={pdfConfig.orientation}
      />

      {/* PWA Install Modal for Android & All Devices */}
      <InstallAndroidModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isAndroid={isAndroid}
        isIOS={isIOS}
      />

      {/* Mobile Bottom Navigation Bar (Android & Smartphone view) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenExportModal={() => {
          setExportError('');
          setIsExportModalOpen(true);
        }}
      />

      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />

      {/* 4. FOOTER */}
      <footer className="border-t border-[#e0e0e0] bg-[#f9f9f9] py-2 px-4 text-center text-[10.5px] text-[#777] mt-auto select-none">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>Minhas Economias © 2026 - Todos os direitos reservados</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm('Deseja resetar os dados para os valores originais do exemplo?')) {
                  setAccounts(INITIAL_ACCOUNTS);
                  setCategories(INITIAL_CATEGORIES);
                  setTransactions(INITIAL_TRANSACTIONS);
                  setDreams(INITIAL_DREAMS);
                  setSelectedAccountIds(INITIAL_ACCOUNTS.map((account) => account.id));
                }
              }}
              className="text-[#5a8710] hover:underline cursor-pointer"
            >
              Restaurar dados de exemplo
            </button>
            <span>•</span>
            <button onClick={() => setIsPdfPreviewOpen(true)} className="hover:underline cursor-pointer">
              Visualizar Extrato PDF
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
