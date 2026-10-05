import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Dna, ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, RefreshCw, Sun, Moon } from 'lucide-react';

export const SignUpPage = () => {
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordLongEnough = password.length >= 10;
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all registration fields.');
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordLongEnough) {
      setError('Password must be at least 10 characters long.');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await signup({
        email,
        password,
        confirm_password: confirmPassword
      });
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account.');
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
            REGISTRATION
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

      {/* Sign Up Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md lab-card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe mx-auto">
              <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-specimen-safe" />
            </div>
            <h1 className="text-2xl font-bold font-sans text-specimen-text tracking-tight">
              Create Researcher Account
            </h1>
            <p className="text-xs font-mono text-specimen-dim">
              Begin your private evolutionary red-teaming laboratory runs
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs font-mono"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-email"
                className="block text-xs font-mono text-specimen-text uppercase font-semibold"
              >
                Institutional / Researcher Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@evoredteam.lab"
                  required
                  autoComplete="email"
                  aria-invalid={email.length > 0 && !isEmailValid}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-xl text-specimen-text text-sm font-mono placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe focus:glow-safe transition shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-password"
                className="block text-xs font-mono text-specimen-text uppercase font-semibold"
              >
                Password (min 10 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {/* Password requirement meter */}
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                <span className={`flex items-center gap-1 ${isPasswordLongEnough ? 'text-teal-600 dark:text-specimen-safe' : 'text-specimen-dim'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>&ge; 10 characters</span>
                </span>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-mono text-specimen-text uppercase font-semibold"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="signup-confirm-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isEmailValid || !isPasswordLongEnough || !doPasswordsMatch}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Enter Lab</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-dish-border text-center text-xs font-mono text-specimen-dim">
            Already registered?{' '}
            <Link
              to="/login"
              className="text-teal-600 dark:text-specimen-safe font-bold hover:underline"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-specimen-dim border-t border-dish-border/40">
        EvoRedTeam Laboratory &bull; Ethical AI Safety Auditing System
      </footer>
    </div>
  );
};
