import 'dotenv/config';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import express, { NextFunction, Request, Response } from 'express';

const port = Number(process.env.PORT ?? 3001);
const databasePath = path.resolve(process.env.DB_FILE ?? 'data/minhas-economias.sqlite');
mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

type FinanceData = {
  accounts: unknown[];
  categories: unknown[];
  transactions: unknown[];
  dreams: unknown[];
};

type AuthenticatedRequest = Request & { userId?: string };

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

function isFinanceData(value: unknown): value is FinanceData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return ['accounts', 'categories', 'transactions', 'dreams'].every((key) =>
    Array.isArray(data[key])
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function issueSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  database
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expiresAt);
  return token;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
  if (!token) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const session = database
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(hashToken(token)) as { user_id: string; expires_at: number } | undefined;
  if (!session || session.expires_at <= Date.now()) {
    if (session) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
    return;
  }

  req.userId = session.user_id;
  next();
}

function respondWithError(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('Erro ao processar solicitação da API:', error);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erro interno do servidor.' });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const data = req.body?.data;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    if (password.length < 10 || password.length > 128) {
      res.status(400).json({ error: 'A senha deve ter entre 10 e 128 caracteres.' });
      return;
    }
    if (!isFinanceData(data)) {
      res.status(400).json({ error: 'Os dados financeiros enviados são inválidos.' });
      return;
    }
    if (database.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
      return;
    }

    const userId = randomBytes(16).toString('hex');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    const now = new Date().toISOString();
    const createUser = database.transaction(() => {
      database
        .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
        .run(userId, email, passwordHash, now);
      database
        .prepare('INSERT INTO user_data (user_id, data_json, updated_at) VALUES (?, ?, ?)')
        .run(userId, JSON.stringify(data), now);
    });
    createUser();

    res.status(201).json({
      token: issueSession(userId),
      user: { email },
      data,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = database
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .get(email) as { id: string; email: string; password_hash: string } | undefined;
    const [salt, storedHash] = user?.password_hash.split(':') ?? ['', ''];
    const actualHash = scryptSync(password, salt || 'invalid-user-salt', 64);
    const expectedHash = Buffer.from(storedHash || '0'.repeat(128), 'hex');

    if (
      !user ||
      expectedHash.length !== actualHash.length ||
      !timingSafeEqual(actualHash, expectedHash)
    ) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    const record = database
      .prepare('SELECT data_json FROM user_data WHERE user_id = ?')
      .get(user.id) as { data_json: string } | undefined;
    if (!record) {
      res.status(500).json({ error: 'Os dados desta conta não foram encontrados.' });
      return;
    }
    res.json({
      token: issueSession(user.id),
      user: { email: user.email },
      data: JSON.parse(record.data_json) as FinanceData,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.header('authorization')!.slice('Bearer '.length);
    database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/data', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    const record = database
      .prepare('SELECT data_json FROM user_data WHERE user_id = ?')
      .get(req.userId) as { data_json: string } | undefined;
    if (!record) {
      res.status(404).json({ error: 'Dados financeiros não encontrados.' });
      return;
    }
    res.json(JSON.parse(record.data_json) as FinanceData);
  } catch (error) {
    next(error);
  }
});

app.put('/api/data', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    if (!isFinanceData(req.body)) {
      res.status(400).json({
        error: 'O formato dos dados é inválido: contas, categorias, transações e sonhos são obrigatórios.',
      });
      return;
    }
    database
      .prepare(`
        INSERT INTO user_data (user_id, data_json, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
      `)
      .run(req.userId, JSON.stringify(req.body), new Date().toISOString());
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use(respondWithError);

app.listen(port, '0.0.0.0', () => {
  console.log(`API Minhas Economias disponível na porta ${port}`);
});
