import React, { useState, useEffect, useRef } from 'react';
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
import { AuthScreen } from './components/AuthScreen';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Wallet, Smartphone, X, Sparkles } from 'lucide-react';
import { formatCurrency } from './utils/formatters';
import { AuthResponse, FinanceData, getFinanceData, logout, saveFinanceData } from './lib/api';

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => localStorage.getItem('me_auth_token_v1')
  );
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem('me_auth_email_v1') ?? ''
  );
  const [authLoading, setAuthLoading] = useState(
    () => Boolean(localStorage.getItem('me_auth_token_v1'))
  );
  const [authError, setAuthError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncError, setSyncError] = useState('');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('inicio');

  // Month and year state (Defaults to October 2026 for Dashboard, November 2026 for Transações)
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9 = Outubro
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Core Data States with localStorage persistence
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('me_accounts_v1');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('me_categories_v1');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('me_transactions_v1');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [dreams, setDreams] = useState<Dream[]>(() => {
    const saved = localStorage.getItem('me_dreams_v1');
    return saved ? JSON.parse(saved) : INITIAL_DREAMS;
  });

  // Filters state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() =>
    INITIAL_ACCOUNTS.map((a) => a.id)
  );
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!sessionToken) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    getFinanceData(sessionToken)
      .then((data) => {
        if (!active) return;
        setAccounts(data.accounts);
        setCategories(data.categories);
        setTransactions(data.transactions);
        setDreams(data.dreams);
        setSelectedAccountIds(data.accounts.map((account) => account.id));
        setDataLoaded(true);
        setAuthError('');
      })
      .catch((error: unknown) => {
        if (!active) return;
        localStorage.removeItem('me_auth_token_v1');
        setSessionToken(null);
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar seus dados do servidor.'
        );
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionToken || !dataLoaded) return;

    const timeout = window.setTimeout(() => {
      const data: FinanceData = { accounts, categories, transactions, dreams };
      setSyncError('');
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => saveFinanceData(sessionToken, data))
        .catch((error: unknown) => {
          setSyncError(
            error instanceof Error
              ? error.message
              : 'Não foi possível salvar os dados no servidor.'
          );
        });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [accounts, categories, transactions, dreams, sessionToken, dataLoaded]);

  const handleAuthenticated = (response: AuthResponse) => {
    localStorage.setItem('me_auth_token_v1', response.token);
    localStorage.setItem('me_auth_email_v1', response.user.email);
    for (const key of [
      'me_accounts_v1',
      'me_categories_v1',
      'me_transactions_v1',
      'me_dreams_v1',
    ]) {
      localStorage.removeItem(key);
    }
    setAccounts(response.data.accounts);
    setCategories(response.data.categories);
    setTransactions(response.data.transactions);
    setDreams(response.data.dreams);
    setSelectedAccountIds(response.data.accounts.map((account) => account.id));
    setUserEmail(response.user.email);
    setSessionToken(response.token);
    setDataLoaded(true);
    setAuthError('');
    setSyncError('');
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await logout(sessionToken);
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? `A sessão foi encerrada neste navegador, mas a API não confirmou o logout: ${error.message}`
            : 'A API não confirmou o encerramento da sessão.'
        );
      }
    }
    localStorage.removeItem('me_auth_token_v1');
    localStorage.removeItem('me_auth_email_v1');
    setSessionToken(null);
    setDataLoaded(false);
    setAuthLoading(false);
  };

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    orientation: 'portrait' as 'portrait' | 'landscape',
  });

  // Account Modal (Create & Edit)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  // Category Modal (Create & Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Transaction Edit Modal
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // PWA Install State & Hook for Android and mobile devices
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Switch month automatically when switching to Transações if desired
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'transacoes' && selectedMonth === 9) {
      setSelectedMonth(10); // Switch to Novembro/2026 to show sample transactions
    } else if (tab === 'inicio' && selectedMonth === 10) {
      setSelectedMonth(9); // Switch to Outubro/2026 to show dashboard view
    }
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
    const accTxs = transactions.filter(
      (t) => t.account === acc.name && t.isConsolidated
    );
    const sum = accTxs.reduce((total, t) => total + t.amount, 0);
    return {
      ...acc,
      balance: acc.initialBalance + sum,
    };
  });

  // Total current balance across selected accounts
  const totalCurrentBalance = accountsWithBalances
    .filter((a) => selectedAccountIds.includes(a.id))
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
    if (installmentsCount > 1) {
      const newTxs: Transaction[] = [];
      const [yearStr, monthStr, dayStr] = txData.date.split('-');
      let currentYear = parseInt(yearStr);
      let currentMonth = parseInt(monthStr);

      for (let i = 1; i <= installmentsCount; i++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dayStr}`;
        newTxs.push({
          ...txData,
          id: `tx-${Date.now()}-${i}`,
          date: dateStr,
          description: `${txData.description} (${i} / ${installmentsCount})`,
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
        ...txData,
        id: `tx-${Date.now()}`,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
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
  const handleOpenNewAccount = () => {
    setAccountToEdit(null);
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
              }
            : a
        )
      );

      // If name changed, rename in associated transactions
      if (oldAccount && oldAccount.name !== accountData.name) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.account === oldAccount.name
              ? { ...t, account: accountData.name }
              : t
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
        prev.map((t) => (t.account === acc.name ? { ...t, account: 'Sem Conta' } : t))
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
        id: `cat-${Date.now()}`,
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
      setSelectedCategoryNames((prev) => prev.filter((cn) => cn !== cat.name));
      // Point affected transactions to 'Sem Categoria'
      setTransactions((prev) =>
        prev.map((t) =>
          t.category === cat.name ? { ...t, category: 'Sem Categoria' } : t
        )
      );
    }
  };

  // Export Modal Confirm
  const handleConfirmExport = (config: {
    startDate: string;
    endDate: string;
    format: 'pdf' | 'xls';
    orientation: 'portrait' | 'landscape';
  }) => {
    setIsExportModalOpen(false);
    if (config.format === 'pdf') {
      setPdfConfig({
        startDate: config.startDate,
        endDate: config.endDate,
        orientation: config.orientation,
      });
      setIsPdfPreviewOpen(true);
    } else {
      // Direct XLS/CSV download
      const filtered = transactions.filter(
        (t) => t.date >= config.startDate && t.date <= config.endDate
      );
      const csv =
        '\uFEFFData;Descricao;Categoria;Conta;Valor (R$)\n' +
        filtered
          .map(
            (t) =>
              `${t.date};"${t.description}";"${t.category}";"${t.account}";"${t.amount
                .toFixed(2)
                .replace('.', ',')}"`
          )
          .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Extrato_${config.startDate}_${config.endDate}.xls`;
      a.click();
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center text-gray-700">
        Carregando seus dados...
      </main>
    );
  }

  if (!sessionToken) {
    const localData: FinanceData = { accounts, categories, transactions, dreams };
    return (
      <AuthScreen
        initialData={localData}
        initialError={authError}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#000000] flex flex-col font-sans text-[14.5px] antialiased">
      {/* 1. TOP HEADER */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        userEmail={userEmail}
        onLogout={handleLogout}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstalled={isInstalled}
      />

      {syncError && (
        <div role="alert" className="bg-red-50 border-b border-red-300 px-4 py-2 text-sm text-red-800">
          Erro ao sincronizar com o servidor: {syncError}
        </div>
      )}

      {/* PWA Android Install Banner */}
      {!isInstalled && showInstallBanner && (
        <div className="bg-[#f0f7d4] border-b border-[#c8e278] px-3 sm:px-4 py-2 text-[13px] text-[#000000] flex items-center justify-between flex-wrap gap-2 shadow-2xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">📱</span>
            <span className="font-bold">
              Instale o Minhas Economias no seu Android ou computador para acesso instantâneo e offline!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-[#82af07] hover:bg-[#6e9406] text-white font-black px-3 py-1 text-[12.5px] rounded-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar Agora</span>
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-[#666666] hover:text-[#000000] p-1 cursor-pointer font-bold text-[13px]"
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>
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
              onDeleteTransactions={handleDeleteTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onToggleConsolidate={handleToggleConsolidate}
              onBatchConsolidate={handleBatchConsolidate}
              onBatchChangeCategory={handleBatchChangeCategory}
              onOpenExportModal={() => setIsExportModalOpen(true)}
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
              accounts={accountsWithBalances}
              categories={categories}
              onAddCategory={(cat) => setCategories((prev) => [...prev, cat])}
              onEditCategory={handleOpenEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onOpenNewAccountModal={handleOpenNewAccount}
              onEditAccount={handleOpenEditAccount}
              onDeleteAccount={handleDeleteAccount}
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
        defaultStartDate="2026-11-01"
        defaultEndDate="2026-11-30"
      />

      {/* Authentic PDF Viewer / Print Preview Modal (Images 6 & 7) */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        transactions={transactions}
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
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isInstalled={isInstalled}
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
