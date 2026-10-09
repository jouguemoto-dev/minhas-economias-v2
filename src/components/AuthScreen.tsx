import React, { FormEvent, useState } from 'react';
import { Logo } from './Logo';
import { AuthResponse, FinanceData, login, register } from '../lib/api';

interface AuthScreenProps {
  initialData: FinanceData;
  initialError?: string;
  onAuthenticated: (response: AuthResponse) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialData,
  initialError,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response =
        mode === 'register'
          ? await register(email, password, initialData)
          : await login(email, password);
      onAuthenticated(response);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível concluir a solicitação.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-4 font-sans">
      <section className="w-full max-w-md bg-white border border-[#b8b8b8] shadow-sm">
        <header className="bg-[#82af07] px-6 py-5 flex justify-center">
          <div className="bg-white rounded-sm px-4 py-2">
            <Logo />
          </div>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-black">
              {mode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Seus dados financeiros ficam salvos com segurança no servidor.
            </p>
          </div>

          <label className="block text-sm font-semibold text-black">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full border border-gray-400 px-3 py-2 font-normal outline-none focus:border-[#82af07]"
            />
          </label>

          <label className="block text-sm font-semibold text-black">
            Senha
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={10}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full border border-gray-400 px-3 py-2 font-normal outline-none focus:border-[#82af07]"
            />
            {mode === 'register' && (
              <span className="mt-1 block font-normal text-xs text-gray-600">
                Use pelo menos 10 caracteres.
              </span>
            )}
          </label>

          {error && (
            <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#82af07] px-4 py-2.5 font-bold text-white hover:bg-[#6e9406] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? 'Aguarde...'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-gray-700">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="font-bold text-[#527800] underline"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
};
