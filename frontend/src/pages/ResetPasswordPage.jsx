/**
 * ResetPasswordPage.jsx — Analyst Password Reset Form (UI only)
 * Design System: Cyber/SIEM | Tailwind
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react';
import { PATHS } from '@routes/paths';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1200);
  };

  if (success) {
    return (
      <div className="text-center font-cyber">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-threat-low/10 border border-threat-low-border flex items-center justify-center text-threat-low shadow-low-neon">
            <CheckCircle size={22} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Password Reset Successful</h2>
        <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto mb-6">
          Your credentials have been successfully updated on the platform directory. You can now authenticate.
        </p>
        <Link
          to={PATHS.LOGIN}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg text-xs font-semibold uppercase tracking-wider bg-cyber-accent-cyan text-cyber-bg-deep shadow-cyan-neon hover:brightness-110 transition-all"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 font-cyber">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-500">// SECURE ACCESS RESET</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
        <p className="text-slate-500 text-sm mt-1">Configure your new credentials to authenticate into the SOC.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-cyber">
        {/* Password */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              className="w-full rounded-lg px-4 py-3 pr-11 text-sm bg-white/[0.03] border border-white/10 text-slate-100 outline-none focus:border-cyber-accent-cyan/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••••••"
            className="w-full rounded-lg px-4 py-3 text-sm bg-white/[0.03] border border-white/10 text-slate-100 outline-none focus:border-cyber-accent-cyan/40 transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg p-3 bg-threat-critical/10 border border-threat-critical-border">
            <AlertCircle size={13} className="text-threat-critical flex-shrink-0" />
            <span className="font-mono text-[10px] text-threat-critical">{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-cyber-accent-cyan border border-cyber-accent-cyan/35 bg-cyber-accent-cyan/10 hover:box-shadow-cyan-neon hover:brightness-110 transition-all duration-200 mt-2 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Updating Credentials...</>
          ) : (
            <><ChevronRight size={14} /> Update Credentials</>
          )}
        </button>
      </form>
    </div>
  );
}
