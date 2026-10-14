import { Account, AutoCategoryRule, Category, Dream, Transaction } from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_DREAMS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';

export interface InitialFinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  dreams: Dream[];
  rules: AutoCategoryRule[];
  invalidKeys: string[];
  warning: string;
}

function isAccountArray(value: unknown): value is Account[] {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item.id === 'string' && typeof item.name === 'string' &&
    typeof item.type === 'string' && typeof item.initialBalance === 'number'
  );
}

function isCategoryArray(value: unknown): value is Category[] {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item.id === 'string' && typeof item.name === 'string' &&
    (item.type === 'despesa' || item.type === 'receita')
  );
}

function isTransactionArray(value: unknown): value is Transaction[] {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item.id === 'string' && typeof item.date === 'string' &&
    typeof item.description === 'string' && typeof item.account === 'string' &&
    typeof item.amount === 'number' &&
    ['despesa', 'receita', 'transferencia'].includes(item.type) &&
    (typeof item.isConsolidated === 'boolean' || item.isConsolidated === undefined)
  );
}

function isDreamArray(value: unknown): value is Dream[] {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item.id === 'string' && typeof item.title === 'string' &&
    typeof item.targetAmount === 'number' && typeof item.currentAmount === 'number'
  );
}

function isRuleArray(value: unknown): value is AutoCategoryRule[] {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item.id === 'string' && typeof item.keyword === 'string' &&
    typeof item.category === 'string' &&
    (item.account === undefined || typeof item.account === 'string')
  );
}

export function loadInitialFinanceData(): InitialFinanceData {
  const invalidKeys: string[] = [];
  const warnings: string[] = [];

  const read = <T>(key: string, fallback: T, validate: (value: unknown) => value is T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return fallback;
      const parsed: unknown = JSON.parse(saved);
      if (!validate(parsed)) throw new Error('Formato de dados incompatível.');
      return parsed;
    } catch (error) {
      invalidKeys.push(key);
      warnings.push(key);
      console.error(`Não foi possível carregar os dados locais "${key}".`, error);
      return fallback;
    }
  };

  return {
    accounts: read('me_accounts_v1', INITIAL_ACCOUNTS, isAccountArray),
    categories: read('me_categories_v1', INITIAL_CATEGORIES, isCategoryArray),
    transactions: read('me_transactions_v1', INITIAL_TRANSACTIONS, isTransactionArray)
      .map((transaction) => ({ ...transaction, isConsolidated: transaction.isConsolidated ?? false })),
    dreams: read('me_dreams_v1', INITIAL_DREAMS, isDreamArray),
    rules: read('me_rules_v1', [], isRuleArray),
    invalidKeys,
    warning: warnings.length
      ? `Alguns dados locais não puderam ser lidos (${warnings.join(', ')}). Eles foram preservados; exporte os dados legíveis antes de corrigir o armazenamento.`
      : '',
  };
}

export function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function getAccountTransactionImpact(transaction: Transaction, accountName: string): number {
  if (transaction.type === 'transferencia') {
    if (transaction.account === accountName) return -Math.abs(transaction.amount);
    if (transaction.toAccount === accountName) return Math.abs(transaction.amount);
    return 0;
  }
  return transaction.account === accountName ? transaction.amount : 0;
}

export function getCurrentDateInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDateInput(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getYearOptions(transactions: Transaction[], selectedYear: number): number[] {
  const years = transactions
    .map((transaction) => Number(transaction.date.slice(0, 4)))
    .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 9999);
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(currentYear - 5, selectedYear - 1, ...years);
  const maxYear = Math.max(currentYear + 5, selectedYear + 1, ...years);
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}
