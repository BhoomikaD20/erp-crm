import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@erp.test');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/customers');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your email and password.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo">
            ◆
          </div>

          <div>
            <div className="login-brand-name">
              ERP · CRM
            </div>

            <div className="login-brand-subtitle">
              Business Portal
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="login-header">
          <span className="login-eyebrow">
            BUSINESS PORTAL
          </span>

          <h1>
            Welcome back
          </h1>

          <p>
            Sign in to continue to your ERP dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner login-error">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <div className="login-field">
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              type="email"
              placeholder="admin@erp.test"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="login-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Signing in...'
              : 'Sign in →'}
          </button>

        </form>

        <div className="login-footer">
          ERP · CRM Business Management System
        </div>

      </div>
    </div>
  );
}