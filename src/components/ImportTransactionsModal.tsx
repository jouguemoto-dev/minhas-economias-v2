import React, { useEffect, useMemo, useState } from 'react';
import { Account, AutoCategoryRule, Category, Transaction } from '../types';
import { createId } from '../lib/persistence';
import {
  ImportFormat,
  ImportedTransactionDraft,
  makeImportFingerprint,
  parseImportFile,
} from '../lib/importTransactions';
import { X } from 'lucide-react';

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  rules: AutoCategoryRule[];
  transactions: Transaction[];
  onImport: (transactions: Transaction[]) => void;
}

export const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  rules,
  transactions,
  onImport,
}) => {
  const [step, setStep] = useState<'format' | 'file'>('format');
  const [format, setFormat] = useState<ImportFormat>('bank');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? '');
  const [drafts, setDrafts] = useState<ImportedTransactionDraft[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    if (!accounts.some((item) => item.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0]?.id ?? '');
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (isOpen) {
      setStep('format');
      setDrafts(null);
      setFileName('');
      setError('');
    }
  }, [isOpen]);

  const account = accounts.find((item) => item.id === selectedAccountId);
  const existingFingerprints = useMemo(() => {
    const fingerprints = new Set<string>();
    transactions.forEach((transaction) => {
      fingerprints.add(
        transaction.importFingerprint ??
          makeImportFingerprint(transaction.date, transaction.amount, transaction.description, transaction.account)
      );
    });
    return fingerprints;
  }, [transactions]);

  const prepared = useMemo(() => {
    if (!drafts || !account) return [];
    const seenFingerprints = new Set(existingFingerprints);
    return drafts.map((draft) => {
      const rule = rules.find((item) =>
        draft.description.toLocaleLowerCase().includes(item.keyword.toLocaleLowerCase())
      );
      const ruleAccount = rule?.account ? accounts.find((item) => item.name === rule.account) : undefined;
      const assignedAccount = ruleAccount?.name ?? account.name;
      const categoryNames = categories.flatMap((item) => [item.name, ...(item.subcategories ?? [])]);
      const assignedCategory =
        rule?.category ??
        (draft.category && categoryNames.includes(draft.category) ? draft.category : 'Sem Categoria');
      const fingerprint = makeImportFingerprint(draft.date, draft.amount, draft.description, assignedAccount);
      const duplicate = seenFingerprints.has(fingerprint);
      seenFingerprints.add(fingerprint);
      return {
        transaction: {
          ...draft,
          id: createId('tx'),
          account: assignedAccount,
          category: assignedCategory,
          isConsolidated: true,
          importFingerprint: fingerprint,
        } satisfies Transaction,
        duplicate,
      };
    });
  }, [accounts, account, categories, drafts, existingFingerprints, rules]);

  if (!isOpen) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setDrafts(null);
    setFileName(file.name);
    setIsReading(true);
    try {
      setDrafts(await parseImportFile(file, format));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Não foi possível ler o arquivo.');
    } finally {
      setIsReading(false);
      event.target.value = '';
    }
  };

  const handleImport = () => {
    const newTransactions = prepared
      .filter((entry) => !entry.duplicate)
      .map((entry) => entry.transaction);
    if (!newTransactions.length) {
      setError('Não há novos lançamentos para importar. Os lançamentos do arquivo já existem no sistema.');
      return;
    }
    onImport(newTransactions);
    onClose();
  };

  const importCount = prepared.filter((entry) => !entry.duplicate).length;
  const duplicateCount = prepared.length - importCount;
  const accept = format === 'bank'
    ? '.ofc,.ofx,.qfx,.qif,.txt,.csv'
    : '.xls,.xlsx,.csv,.txt';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="bg-white border-2 border-[#555] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#000] font-sans"
      >
        <header className="bg-[#eee] border-b border-[#ccc] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 id="import-title" className="font-black text-lg">Importar dados</h2>
            <p className="text-sm">Escolha um tipo de arquivo e uma conta de destino.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="border border-[#888] bg-white p-1">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 space-y-4">
          {step === 'format' ? (
            <fieldset className="space-y-3">
              <legend className="font-bold">Selecione uma opção</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="import-format"
                  checked={format === 'bank'}
                  onChange={() => setFormat('bank')}
                />
                <span>Importar arquivo do meu home banking (.ofc, .ofx, .qfx, .qif, .txt e .csv)</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="import-format"
                  checked={format === 'spreadsheet'}
                  onChange={() => setFormat('spreadsheet')}
                />
                <span>Importar planilha Excel 97, 2000, XP, 2003 ou 2007 (.xls e .xlsx)</span>
              </label>
            </fieldset>
          ) : (
            <>
              <label className="block space-y-1 font-bold">
                <span>Importar para a conta</span>
                <select
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  className="block w-full border border-[#888] bg-white px-2 py-2"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>

              <label className="block space-y-1 font-bold">
                <span>Arquivo</span>
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileChange}
                  disabled={!account || isReading}
                  className="block w-full border border-[#aaa] p-2 font-normal"
                />
                {fileName && <span className="block text-xs font-normal">{fileName}</span>}
              </label>

              {isReading && <p role="status">Lendo e validando o arquivo...</p>}
              {error && <p role="alert" className="border border-red-300 bg-red-50 p-2 text-red-800">{error}</p>}

              {prepared.length > 0 && (
                <section className="space-y-2">
                  <p role="status" className="font-bold">
                    {prepared.length} lançamento(s) lido(s). {importCount} novo(s) para importar; {duplicateCount} duplicado(s) serão ignorados.
                  </p>
                  <div className="max-h-56 overflow-auto border border-[#bbb]">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-[#eee]">
                        <tr>
                          <th className="p-2">Data</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2">Categoria</th>
                          <th className="p-2 text-right">Valor</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepared.slice(0, 30).map(({ transaction, duplicate }) => (
                          <tr key={transaction.id} className="border-t border-gray-200">
                            <td className="p-2 whitespace-nowrap">{transaction.date}</td>
                            <td className="p-2">{transaction.description}</td>
                            <td className="p-2">{transaction.category}</td>
                            <td className="p-2 text-right">{transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2">{duplicate ? 'Duplicado' : 'Novo'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {prepared.length > 30 && <p className="p-2 text-sm">Exibindo os primeiros 30 lançamentos.</p>}
                  </div>
                  <p className="text-xs text-gray-700">
                    Os lançamentos importados serão marcados como consolidados. Regras por palavra-chave preenchem categoria e conta quando aplicável.
                  </p>
                </section>
              )}
            </>
          )}

          <footer className="flex justify-end gap-2 border-t border-gray-200 pt-3">
            {step === 'format' ? (
              <>
                <button type="button" onClick={onClose} className="border border-[#888] px-4 py-2">Cancelar</button>
                <button type="button" onClick={() => setStep('file')} className="bg-[#5a8710] px-4 py-2 font-bold text-white">Avançar</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep('format')} className="border border-[#888] px-4 py-2">Voltar</button>
                <button type="button" onClick={onClose} className="border border-[#888] px-4 py-2">Cancelar</button>
              </>
            )}
            {step === 'file' && drafts && (
              <button
                type="button"
                disabled={importCount === 0}
                onClick={handleImport}
                className="bg-[#5a8710] px-4 py-2 font-bold text-white disabled:opacity-50"
              >
                Importar {importCount} lançamento(s)
              </button>
            )}
          </footer>
        </div>
      </section>
    </div>
  );
};
