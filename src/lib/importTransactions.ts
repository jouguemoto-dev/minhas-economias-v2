import { TransactionType } from '../types';

export interface ImportedTransactionDraft {
  date: string;
  description: string;
  amount: number;
  category?: string;
  type: TransactionType;
}

export type ImportFormat = 'bank' | 'spreadsheet';

function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const qifDate = text.match(/^(\d{1,2})\/(\d{1,2})['’](\d{2})$/);
  if (qifDate) {
    const shortYear = Number(qifDate[3]);
    const year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    return `${year}-${qifDate[1].padStart(2, '0')}-${qifDate[2].padStart(2, '0')}`;
  }

  const localized = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (localized) {
    const year = localized[3].length === 2 ? `20${localized[3]}` : localized[3];
    const first = Number(localized[1]);
    const second = Number(localized[2]);
    const [month, day] = first > 12 ? [second, first] : second > 12 ? [first, second] : [second, first];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const excelSerial = Number(text);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + excelSerial * 86400000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  if (typeof value === 'number' && value > 20000 && value < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  throw new Error(`Data inválida no arquivo: "${text || '(vazia)'}".`);
}

function parseAmount(value: unknown): number {
  const original = String(value ?? '').trim().replace(/[R$€£\s]/g, '');
  const isParenthesizedNegative = original.startsWith('(') && original.endsWith(')');
  const text = original.replace(/^\(|\)$/g, '');
  if (!text) throw new Error('O arquivo contém um lançamento sem valor.');

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalized = text;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = /,\d{3}$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
  } else if (lastDot >= 0 && /\.\d{3}$/.test(text)) {
    normalized = text.replace(/\./g, '');
  }
  const parsedAmount = Number(normalized);
  const amount = isParenthesizedNegative ? -Math.abs(parsedAmount) : parsedAmount;
  if (!Number.isFinite(amount)) throw new Error(`Valor inválido no arquivo: "${text}".`);
  return amount;
}

function createDraft(date: unknown, description: unknown, amount: unknown, category?: unknown): ImportedTransactionDraft {
  const parsedAmount = parseAmount(amount);
  const parsedDescription = String(description ?? '').trim();
  if (!parsedDescription) throw new Error('O arquivo contém um lançamento sem descrição.');
  return {
    date: parseDate(date),
    description: parsedDescription,
    amount: parsedAmount,
    category: String(category ?? '').trim() || undefined,
    type: parsedAmount < 0 ? 'despesa' : 'receita',
  };
}

function extractTag(record: string, tag: string): string {
  const value = record.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))?.[1];
  return value?.trim() ?? '';
}

function parseOfx(text: string): ImportedTransactionDraft[] {
  const records = [...text.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/?STMTTRN>|<\/?BANKTRANLIST>|<\/?LEDGERBAL>|$)/gi)];
  if (!records.length) throw new Error('Nenhum lançamento OFX foi encontrado no arquivo.');

  return records.map(([, record], index) => {
    const date = extractTag(record, 'DTPOSTED').slice(0, 8);
    const formattedDate = date.length === 8
      ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
      : date;
    const description = extractTag(record, 'NAME') || extractTag(record, 'MEMO');
    try {
      return createDraft(formattedDate, description, extractTag(record, 'TRNAMT'));
    } catch (error) {
      throw new Error(`Lançamento OFX ${index + 1}: ${error instanceof Error ? error.message : 'dados inválidos.'}`);
    }
  });
}

function parseQif(text: string): ImportedTransactionDraft[] {
  const records = text.split(/\r?\n\^\s*(?:\r?\n|$)/);
  const parsed = records.flatMap((record, index) => {
    const date = record.match(/^D(.+)$/mi)?.[1];
    const amount = record.match(/^T(.+)$/mi)?.[1];
    const description = record.match(/^P(.+)$/mi)?.[1] ?? record.match(/^M(.+)$/mi)?.[1];
    const category = record.match(/^L(.+)$/mi)?.[1];
    if (!date && !amount && !description) return [];
    try {
      if (!date || amount === undefined || !description) {
        throw new Error('data, descrição e valor são obrigatórios.');
      }
      return [createDraft(date, description, amount, category)];
    } catch (error) {
      throw new Error(`Lançamento QIF ${index + 1}: ${error instanceof Error ? error.message : 'dados inválidos.'}`);
    }
  });
  if (!parsed.length) throw new Error('Nenhum lançamento QIF foi encontrado no arquivo.');
  return parsed;
}

function parseDelimitedText(text: string): ImportedTransactionDraft[] {
  const content = text.replace(/^\uFEFF/, '');
  const delimiter = content.includes('\t') ? '\t' : content.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (character === '"' && content[index + 1] === '"' && quoted) {
      cell += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('O arquivo delimitado contém aspas sem fechamento.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) throw new Error('O arquivo de texto está vazio.');

  const normalizeHeader = (header: string) =>
    header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const headers = rows[0].map(normalizeHeader);
  const findColumn = (patterns: RegExp[]) => headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  const dateColumn = findColumn([/^data\b/, /date/, /^dt\b/]);
  const descriptionColumn = findColumn([/descricao/, /historico/, /memo/, /payee/, /estabelecimento/, /lancamento/]);
  const amountColumn = findColumn([/^valor$/, /valor\b/, /amount/, /quantia/]);
  const categoryColumn = findColumn([/categoria/, /category/]);
  const hasHeader = dateColumn >= 0 && descriptionColumn >= 0 && amountColumn >= 0;
  const columns = hasHeader
    ? { date: dateColumn, description: descriptionColumn, amount: amountColumn, category: categoryColumn }
    : { date: 0, description: 1, amount: 2, category: -1 };
  const dataRows = rows.slice(hasHeader ? 1 : 0);
  if (!dataRows.length) throw new Error('O arquivo não contém linhas de lançamentos.');

  return dataRows.map((values, index) => {
    try {
      return createDraft(
        values[columns.date],
        values[columns.description],
        values[columns.amount],
        columns.category >= 0 ? values[columns.category] : undefined
      );
    } catch (error) {
      throw new Error(`Linha ${index + (hasHeader ? 2 : 1)}: ${error instanceof Error ? error.message : 'dados inválidos.'}`);
    }
  });
}

async function parseSpreadsheet(data: ArrayBuffer): Promise<ImportedTransactionDraft[]> {
  const XLSX = await import('@e965/xlsx');
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('A planilha não possui uma aba com dados.');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!rows.length) throw new Error('A planilha está vazia.');
  const text = rows
    .map((row) => row.map((cell) => {
      if (!(cell instanceof Date)) return String(cell ?? '');
      const month = String(cell.getMonth() + 1).padStart(2, '0');
      const day = String(cell.getDate()).padStart(2, '0');
      return `${cell.getFullYear()}-${month}-${day}`;
    }).join('\t'))
    .join('\n');
  return parseDelimitedText(text);
}

export async function parseImportFile(
  file: Pick<File, 'name' | 'arrayBuffer' | 'text'>,
  format: ImportFormat
): Promise<ImportedTransactionDraft[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (format === 'spreadsheet' || ['xls', 'xlsx'].includes(extension)) {
    return parseSpreadsheet(await file.arrayBuffer());
  }

  const bytes = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  if (/<STMTTRN>/i.test(text)) return parseOfx(text);
  if (/^!type\b/im.test(text) || /^D.+\r?\nT/m.test(text)) return parseQif(text);
  return parseDelimitedText(text);
}

export function makeImportFingerprint(date: string, amount: number, description: string, account: string): string {
  const normalizedDescription = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${account.toLocaleLowerCase()}|${date}|${amount.toFixed(2)}|${normalizedDescription}`;
}
