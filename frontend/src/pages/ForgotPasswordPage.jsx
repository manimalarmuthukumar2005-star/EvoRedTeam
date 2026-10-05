import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Dna, KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon, ShieldCheck, Clock, Inbox } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await forgotPassword({ email: email.trim().toLowerCase() });
      setSubmitted(true);
      setMessage(res?.message || 'If an account exists with that email address, a password reset link has been dispatched to your inbox.');
      setCooldown(60);
    } catch (err) {
      // In secure production environments, give consistent generic confirmation
      setSubmitted(true);
      setMessage('If an account exists with that email address, a password reset link has been dispatched to your inbox.');
      setCooldown(60);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (cooldown === 0 && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-dish-bg text-specimen-text flex flex-col justify-between selection:bg-specimen-safe/30 selection:text-specimen-text">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-dish-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe">
            <Dna className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
          </div>
          <span className="font-sans font-bold text-base tracking-tight text-specimen-text">
            EvoRedTeam
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dish-subtle border border-dish-border text-specimen-dim uppercase">
            ACCOUNT RECOVERY
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md lab-card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe mx-auto">
              <KeyRound className="w-6 h-6 text-teal-600 dark:text-specimen-safe" />
            </div>
            <h1 className="text-2xl font-bold font-sans text-specimen-text tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs font-mono text-specimen-dim">
              Enter your registered laboratory email to receive password recovery instructions
            </p>
          </div>

          {submitted ? (
            <div className="space-y-5">
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 space-y-2.5 text-xs font-mono"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verification Email Dispatched</span>
                </div>
                <p className="leading-relaxed">
                  We've sent a secure reset link to <strong className="text-teal-700 dark:text-specimen-safe underline">{email}</strong>.
                </p>
              </div>

              {/* Security & Guidance Notice */}
              <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border text-xs font-mono space-y-2.5 text-specimen-dim">
                <div className="flex items-center gap-2 text-specimen-text font-semibold">
                  <Inbox className="w-4 h-4 text-teal-600 dark:text-specimen-safe shrink-0" />
                  <span>Check Your Inbox</span>
                </div>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside leading-relaxed">
                  <li>Click the link in the email to set a new password.</li>
                  <li>The reset link is single-use and will expire in <strong className="text-specimen-text">30 minutes</strong>.</li>
                  <li>If you don't see the email, check your spam or junk folder.</li>
                </ul>
              </div>

              {/* Resend Cooldown Action */}
              <div className="pt-1 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border disabled:opacity-50 disabled:cursor-not-allowed text-specimen-text font-bold font-mono text-xs flex items-center justify-center gap-2 transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Resending Link...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
                      <span>Resend link in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Didn't receive email? Resend</span>
                    </>
                  )}
                </button>

                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
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

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-mono text-specimen-text uppercase font-semibold"
                >
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@evoredteam.lab"
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-xl text-specimen-text text-sm font-mono placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe focus:glow-safe transition shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isEmailValid}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-specimen-dim hover:text-teal-600 dark:hover:text-specimen-safe transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
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
