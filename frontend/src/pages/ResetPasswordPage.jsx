import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Dna, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Sun, Moon } from 'lucide-react';

export const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  const [token, setToken] = useState(rawToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordLongEnough = newPassword.length >= 10;
  const doPasswordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Missing password reset token. Please use the link provided in your email.');
      return;
    }
    if (!isPasswordLongEnough) {
      setError('New password must be at least 10 characters long.');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dish-bg text-specimen-text flex flex-col justify-between selection:bg-specimen-safe/30 selection:text-specimen-text">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-dish-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe">
            <Dna className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
          </div>
          <span className="font-sans font-bold text-base tracking-tight text-specimen-text">
            EvoRedTeam
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dish-subtle border border-dish-border text-specimen-dim uppercase">
            RESET CREDENTIALS
          </span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          className="p-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </header>

      {/* Main Reset Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md lab-card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe mx-auto">
              <KeyRound className="w-6 h-6 text-teal-600 dark:text-specimen-safe" />
            </div>
            <h1 className="text-2xl font-bold font-sans text-specimen-text tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs font-mono text-specimen-dim">
              Choose a strong password with at least 10 characters
            </p>
          </div>

          {success ? (
            <div className="space-y-5">
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Password Reset Successful</span>
                </div>
                <p className="leading-relaxed">
                  Your credentials have been securely updated and all prior sessions invalidated. Please sign in with your new password.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full py-3 px-4 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs font-mono"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!rawToken && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-token"
                    className="block text-xs font-mono text-specimen-text uppercase font-semibold"
                  >
                    Reset Security Token
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste reset token from email"
                    required
                    className="w-full px-3 py-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-xl text-specimen-text text-xs font-mono focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
                  />
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-mono text-specimen-text uppercase font-semibold"
                >
                  New Password (min 10 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-xl text-specimen-text text-sm font-mono placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe focus:glow-safe transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-mono text-specimen-text uppercase font-semibold"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-xl text-specimen-text text-sm font-mono placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe focus:glow-safe transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <div className={`text-[11px] font-mono pt-1 ${doPasswordsMatch ? 'text-teal-600 dark:text-specimen-safe' : 'text-rose-600 dark:text-rose-400'}`}>
                    {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token.trim() || !isPasswordLongEnough || !doPasswordsMatch}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs font-mono text-specimen-dim hover:text-teal-600 dark:hover:text-specimen-safe transition"
                >
                  Cancel and return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-specimen-dim border-t border-dish-border/40">
        EvoRedTeam Laboratory &bull; Ethical AI Safety Auditing System
      </footer>
    </div>
  );
};
