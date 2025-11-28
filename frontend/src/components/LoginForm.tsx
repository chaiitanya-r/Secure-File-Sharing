import { useState } from 'react';
import type { FormEvent } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<unknown>;
  onRegister: (email: string, password: string) => Promise<unknown>;
}

export function LoginForm({ onLogin, onRegister }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{isRegister ? 'Create Account' : 'Secure Login'}</h2>
      {error && <p className="error">{error}</p>}
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={12}
        />
        {isRegister && (
          <span style={{ fontSize: '0.85rem', color: '#9aa8c7', marginTop: '0.25rem' }}>
            Minimum 12 characters required
          </span>
        )}
      </label>
      <button type="submit" disabled={loading}>
        {loading
          ? isRegister
            ? 'Creating account…'
            : 'Signing in…'
          : isRegister
            ? 'Sign Up'
            : 'Login'}
      </button>
      <p className="toggle-auth">
        {isRegister ? 'Already have an account? ' : "Don't have an account? "}
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          className="link-button"
        >
          {isRegister ? 'Login' : 'Sign Up'}
        </button>
      </p>
    </form>
  );
}


