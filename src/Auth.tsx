import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { loginApi, registerApi } from './api';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginApi({ email, password });
        login(res.token, res.user);
      } else {
        const res = await registerApi({ email, password, name });
        login(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Subtle purple background ambient light to match app palette */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#18181b] border border-[#27272a] p-8 sm:p-10 rounded-3xl shadow-xl">
          
          {/* Logo / Brand */}
          <div className="text-center mb-10 flex flex-col items-center">
            <img 
              src="/FAVICONNOTE.png" 
              alt="Favicon" 
              className="w-16 h-16 rounded-2xl mb-4 object-contain" 
            />
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">NoteHub</h1>
            <p className="text-[#a1a1aa] font-medium text-sm mt-2">
              {isLogin ? 'Welcome back. Sign in to continue.' : 'Start your journey today.'}
            </p>
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#a1a1aa] ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a1a1aa] group-focus-within:text-white transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#09090b] text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-white focus:border-white border border-[#27272a] transition-all hover:border-white"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#a1a1aa] ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a1a1aa] group-focus-within:text-white transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#09090b] text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-white focus:border-white border border-[#27272a] transition-all hover:border-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#a1a1aa] ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a1a1aa] group-focus-within:text-white transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b] text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-white focus:border-white border border-[#27272a] transition-all hover:border-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full group relative flex items-center justify-center gap-2 bg-white text-black hover:bg-[#e4e4e7] border border-white rounded-xl px-4 py-4 font-semibold text-base transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-black" />
                  <span className="text-black">Processing...</span>
                </>
              ) : (
                <>
                  <span className="text-black">{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} className="text-black group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#27272a] text-center">
            <p className="text-sm text-[#a1a1aa]">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-white hover:text-[#e4e4e7] font-semibold transition-colors border-b border-transparent hover:border-white"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
