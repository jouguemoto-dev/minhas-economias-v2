export function formatCurrency(value: number): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}R$ ${formatted}`;
}

export function formatSimpleAmount(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

export function formatSignedAmount(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) {
    return `- ${formatted}`;
  } else if (value > 0) {
    return `+ ${formatted}`;
  }
  return formatted;
}

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DAYS_OF_WEEK_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function getMonthYearLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_PT[monthIndex]}/${year}`;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateShortYear(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
}

export function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAYS_OF_WEEK_PT[date.getDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${y}, ${dayName}`;
}
