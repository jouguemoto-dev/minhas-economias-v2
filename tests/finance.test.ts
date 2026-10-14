import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import test from 'node:test';
import * as XLSX from '@e965/xlsx';
import { getAccountTransactionImpact } from '../src/lib/persistence';
import { makeImportFingerprint, parseImportFile } from '../src/lib/importTransactions';
import { Transaction } from '../src/types';

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transfer-1',
    date: '2026-10-14',
    description: 'Transferência',
    category: 'Transferência',
    account: 'Conta A',
    toAccount: 'Conta B',
    amount: -125.5,
    type: 'transferencia',
    isConsolidated: true,
    ...overrides,
  };
}

test('transfers debit the source and credit the destination without changing total balance', () => {
  const transfer = createTransaction();
  const sourceImpact = getAccountTransactionImpact(transfer, 'Conta A');
  const destinationImpact = getAccountTransactionImpact(transfer, 'Conta B');

  assert.equal(sourceImpact, -125.5);
  assert.equal(destinationImpact, 125.5);
  assert.equal(sourceImpact + destinationImpact, 0);
  assert.equal(getAccountTransactionImpact(transfer, 'Conta C'), 0);
});

test('parses OFX transactions with signed amounts and dates', async () => {
  const ofx = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261014120000<TRNAMT>-45.90<NAME>Padaria</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261015120000<TRNAMT>1200.00<NAME>Salário</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  const rows = await parseImportFile(new File([ofx], 'extrato.ofx'), 'bank');

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map(({ date, description, amount, type }) => ({ date, description, amount, type })),
    [
      { date: '2026-10-14', description: 'Padaria', amount: -45.9, type: 'despesa' },
      { date: '2026-10-15', description: 'Salário', amount: 1200, type: 'receita' },
    ]
  );
});

test('parses QIF and Brazilian semicolon-separated text files', async () => {
  const qif = `!Type:Bank
D10/14'26
T-12,50
PCafé
^`;
  const qifRows = await parseImportFile(new File([qif], 'extrato.qif'), 'bank');
  assert.equal(qifRows[0].date, '2026-10-14');
  assert.equal(qifRows[0].amount, -12.5);

  const csv = `Data;Descrição;Categoria;Valor
14/10/2026;"Mercado; Central";Mercado;-35,90`;
  const csvRows = await parseImportFile(new File([csv], 'extrato.txt'), 'bank');
  assert.equal(csvRows[0].description, 'Mercado; Central');
  assert.equal(csvRows[0].category, 'Mercado');
  assert.equal(csvRows[0].amount, -35.9);
});

test('parses Excel date cells and numeric values', async () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Data', 'Descrição', 'Valor'],
    [new Date(2026, 9, 14), 'Conta de luz', -123.45],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extrato');
  const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const rows = await parseImportFile(
    new File([Buffer.from(fileData)], 'extrato.xlsx'),
    'spreadsheet'
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-10-14');
  assert.equal(rows[0].amount, -123.45);
});

test('import fingerprints retain amount sign and normalize descriptions', () => {
  const debit = makeImportFingerprint('2026-10-14', -10, 'CAFÉ  Central', 'Conta A');
  const sameDebit = makeImportFingerprint('2026-10-14', -10, 'cafe central', 'Conta A');
  const credit = makeImportFingerprint('2026-10-14', 10, 'cafe central', 'Conta A');

  assert.equal(debit, sameDebit);
  assert.notEqual(debit, credit);
});
