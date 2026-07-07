import React, { useState } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Wallet, Loader2, Database, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../i18n/LanguageContext';

export function Auth() {
  const { t, language, setLanguage } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasSupabaseConfig) {
      setError("Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    setError(null);

    // Quick validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Registration success, switch to login
        setIsLogin(true);
        setError("Registration successful! Please log in.");
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col justify-center items-center p-6 relative">
      <button
        onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
        className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all flex items-center justify-center"
        title={language === 'en' ? 'Switch to Myanmar' : 'Switch to English'}
      >
        <Globe className="w-4 h-4" />
        <span className="ml-2 text-xs font-semibold uppercase">{language}</span>
      </button>

      {!hasSupabaseConfig && (
        <div className="max-w-md w-full mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-300">
          <div className="flex items-center gap-2 mb-2 font-bold">
            <Database className="w-4 h-4" />
            <span>Missing Supabase Configuration</span>
          </div>
          <p className="mb-2">To use this app, you need to connect your Supabase project.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open the <strong>Settings</strong> menu in AI Studio (gear icon).</li>
            <li>Add <code className="bg-rose-500/20 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-rose-500/20 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Run the SQL schema provided in <code className="bg-rose-500/20 px-1 rounded">supabase-schema.sql</code> in your Supabase SQL Editor.</li>
          </ul>
        </div>
      )}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight text-center">
              {isLogin ? t('welcome_back') : t('create_account')}
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start tracking your finances.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                error.includes("successful") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl px-4 py-3 mt-4 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? t('sign_in') : t('sign_up'))}
            </button>
          </form>
        </div>

        <div className="bg-white/5 border-t border-white/10 p-4 text-center">
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
            <span>{isLogin ? t('no_account') : t('already_have_account')}</span>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-white font-bold hover:underline focus:outline-none"
            >
              {isLogin ? t('sign_up') : t('sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
