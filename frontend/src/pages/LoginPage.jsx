/* LoginPage.jsx — Enterprise SOC authentication portal */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      navigate(PATHS.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed. Verify credentials and clearance level.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--cyber-accent-cyan)' }}>
            // SOC PORTAL AUTHENTICATION
          </span>
        </div>
        <h2 className="font-headings text-3xl font-bold" style={{ color: 'var(--cyber-text-bright)' }}>
          Platform Sign-In
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--cyber-text-muted)' }}>
          Authenticate to access the Security Operations Center command interface. Unauthorized access is monitored and logged.
        </p>
      </div>

      {/* Demo credentials notice */}
      <div
        className="mb-6 rounded-xl p-3.5 flex items-start gap-3"
        style={{
          background: 'rgba(0,229,255,0.05)',
          border: '1px solid rgba(0,229,255,0.15)',
        }}
      >
        <ShieldCheck size={14} style={{ color: 'var(--cyber-accent-cyan)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cyber-accent-cyan)' }}>
            Demo Mode Active
          </p>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
            Use any valid email address and password to access the Security Operations Center.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Analyst Email */}
        <div>
          <label
            htmlFor="email"
            className="block font-mono text-[10px] uppercase tracking-widest mb-2"
            style={{ color: 'var(--cyber-text-muted)' }}
          >
            Analyst Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            placeholder="analyst@soc.enterprise.io"
            className="input-cyber"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--cyber-text-muted)' }}
            >
              Security Credential
            </label>
            <Link
              to={PATHS.FORGOT_PASSWORD}
              className="font-mono text-[10px] transition-colors"
              style={{ color: 'var(--cyber-accent-cyan)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
            >
              Reset credentials →
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••••••••••"
              className="input-cyber pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--cyber-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-text-base)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="flex items-start gap-2.5 rounded-xl p-3.5"
            style={{
              background: 'var(--threat-critical-glow)',
              border: '1px solid var(--threat-critical-border)',
            }}
          >
            <AlertCircle size={13} style={{ color: 'var(--threat-critical)', flexShrink: 0, marginTop: 1 }} />
            <span className="font-mono text-xs" style={{ color: 'var(--threat-critical)' }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          id="login-submit-btn"
          disabled={loading || !form.email || !form.password}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200 mt-2"
          style={{
            background: loading
              ? 'rgba(0,229,255,0.05)'
              : 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,180,255,0.08) 100%)',
            border: '1px solid rgba(0,229,255,0.3)',
            color: 'var(--cyber-accent-cyan)',
            cursor: loading || !form.email || !form.password ? 'not-allowed' : 'pointer',
            opacity: loading || !form.email || !form.password ? 0.55 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)';
          }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Authenticating Identity...</>
          ) : (
            <>
              <ShieldAlert size={14} />
              Authenticate &amp; Access Platform
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-7 text-center">
        <span className="font-mono text-[10px]" style={{ color: 'var(--cyber-text-dim)' }}>
          New analyst?{' '}
        </span>
        <Link
          to={PATHS.REGISTER}
          className="font-mono text-[10px] transition-colors"
          style={{ color: 'var(--cyber-accent-cyan)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
        >
          Request platform access →
        </Link>
      </div>
    </div>
  );
}
