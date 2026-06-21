import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Shield, Eye, EyeOff, Terminal, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]       = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]       = useState({ username:'', email:'', password:'' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = mode === 'login'
      ? await login(form.username, form.password)
      : await register(form.username, form.email, form.password);
    if (result.success) { toast.success('Access granted'); navigate('/'); }
    else toast.error(result.error);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-900/50 border border-cyber-700/50 mb-4">
            <Shield className="w-8 h-8 text-cyber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cyber<span className="text-cyber-400">Panel</span></h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">SOC Threat Intelligence Dashboard</p>
        </div>
        <div className="glass-card p-8">
          <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1 mb-6">
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode===m?'bg-cyber-700 text-white':'text-gray-400 hover:text-gray-200'}`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-mono mb-1.5 block">USERNAME / EMAIL</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={form.username} onChange={e => setForm({...form,username:e.target.value})}
                  className="input-dark pl-9" placeholder="analyst_01" required autoFocus />
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="text-xs text-gray-400 font-mono mb-1.5 block">EMAIL</label>
                <input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})}
                  className="input-dark" placeholder="analyst@soc.local" required />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 font-mono mb-1.5 block">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPass?'text':'password'} value={form.password}
                  onChange={e => setForm({...form,password:e.target.value})}
                  className="input-dark pl-9 pr-9" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5 disabled:opacity-50">
              {loading ? <span className="font-mono text-xs">authenticating<span className="blink">_</span></span>
                : <><Terminal className="w-4 h-4" />{mode==='login'?'Access System':'Create Account'}</>}
            </button>
          </form>
          {mode === 'login' && <p className="text-center text-xs text-gray-600 font-mono mt-4">Default: admin / admin123</p>}
        </div>
      </div>
    </div>
  );
}
