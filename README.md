# Minhas Economias

Aplicação de controle financeiro com frontend React/Vite. Não é necessário criar uma conta ou fazer login.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Executar localmente

1. Instale as dependências:
   ```sh
   npm install
   ```
2. Inicie o frontend:
   ```sh
   npm run dev
   ```
3. Abra http://localhost:3000. O sistema abre diretamente no painel.

Os dados financeiros são salvos no armazenamento local do navegador e ficam disponíveis no mesmo navegador e dispositivo.

## Dados

- Contas do tipo cartão de crédito também podem guardar limite total, dia de fechamento e dia de vencimento da fatura.
- Contas, categorias, transações e sonhos são salvos automaticamente no navegador.
- Orçamentos e regras de categorização também são salvos automaticamente neste navegador.
- Use **Opções > Exportar Dados** para gerar uma planilha `.xlsx` ou um extrato em PDF.
- Use **Opções > Importar OFX / Excel** para importar `.ofc`, `.ofx`, `.qfx`, `.qif`, `.txt`, `.csv`, `.xls` ou `.xlsx`.
- Arquivos de texto tabulares precisam ter colunas de data, descrição e valor na primeira linha; arquivos sem cabeçalho devem usar essa ordem.
- Antes de confirmar a importação, o sistema mostra uma prévia, aplica regras por palavra-chave, marca os lançamentos como consolidados e ignora duplicatas.

Para validar tipos e gerar o frontend:

```sh
npm test
npm run lint
npm run build
```

Os dados ficam neste navegador; limpar os dados do site ou trocar de dispositivo pode removê-los. Exporte uma cópia regularmente para preservá-los. `npm start` serve uma compilação já gerada; execute `npm run build` antes.
