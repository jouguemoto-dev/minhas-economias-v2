import { Account, Category, Dream, Transaction } from '../types';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Carteira', balance: 0, initialBalance: 0, type: 'carteira', isChecked: true },
  { id: '2', name: 'Conta corrente', balance: 0, initialBalance: 0, type: 'corrente', isChecked: true },
  { id: '3', name: 'Cartão de crédito', balance: 0, initialBalance: 0, type: 'cartao', isChecked: true },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'sem_cat', name: 'Sem Categoria', type: 'despesa' },
  { id: 'transf', name: 'Transferência', type: 'despesa' },
  {
    id: 'alim',
    name: 'Alimentação',
    type: 'despesa',
    subcategories: ['Restaurante', 'Mercado', 'Lanches'],
  },
  {
    id: 'casa',
    name: 'Moradia',
    type: 'despesa',
    subcategories: ['Aluguel', 'Energia', 'Água', 'Internet'],
  },
  {
    id: 'educ',
    name: 'Educação',
    type: 'despesa',
    subcategories: ['Cursos', 'Livros'],
  },
  { id: 'lazer', name: 'Lazer', type: 'despesa', subcategories: ['Passeios', 'Streaming'] },
  { id: 'outros', name: 'Outras despesas', type: 'despesa' },
  {
    id: 'rec',
    name: 'Receitas',
    type: 'receita',
    subcategories: ['Salário', 'Freelance', 'Outras receitas'],
  },
  { id: 'saude', name: 'Saúde', type: 'despesa', subcategories: ['Farmácia', 'Consultas'] },
  {
    id: 'transp',
    name: 'Transporte',
    type: 'despesa',
    subcategories: ['Combustível', 'Transporte público'],
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2026-10-03',
    description: 'Compra no mercado',
    category: 'Mercado',
    account: 'Conta corrente',
    amount: -85.5,
    type: 'despesa',
    isConsolidated: true,
  },
  {
    id: 'tx-2',
    date: '2026-10-05',
    description: 'Transporte público',
    category: 'Transporte público',
    account: 'Carteira',
    amount: -12,
    type: 'despesa',
    isConsolidated: true,
  },
  {
    id: 'tx-3',
    date: '2026-10-10',
    description: 'Exemplo de receita',
    category: 'Salário',
    account: 'Conta corrente',
    amount: 250,
    type: 'receita',
    isConsolidated: true,
  },
  {
    id: 'tx-4',
    date: '2026-10-14',
    description: 'Assinatura de exemplo',
    category: 'Streaming',
    account: 'Cartão de crédito',
    amount: -19.9,
    type: 'despesa',
    isConsolidated: false,
  },
];

export const INITIAL_DREAMS: Dream[] = [
  {
    id: '1',
    title: 'Fundo para imprevistos',
    targetAmount: 1000,
    currentAmount: 200,
    targetDate: '2027-12-31',
    category: 'Reserva',
  },
  {
    id: '2',
    title: 'Projeto pessoal',
    targetAmount: 500,
    currentAmount: 100,
    targetDate: '2027-07-15',
    category: 'Lazer',
  },
];
