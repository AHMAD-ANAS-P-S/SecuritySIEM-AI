/* ForgotPasswordPage.jsx — Security credentials reset request */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { PATHS } from '@routes/paths';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  if (sent) return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'var(--threat-low-glow)', border: '1px solid var(--threat-low-border)' }}>
        <CheckCircle size={26} className="text-emerald-500 animate-pulse" />
      </div>
      <h2 className="font-headings text-2xl font-bold mb-2 text-white">Reset Token Dispatched</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--cyber-text-muted)' }}>
        Identity verification instructions have been dispatched to <span style={{ color: 'var(--cyber-accent-cyan)' }}>{email}</span>.
      </p>
      <Link to={PATHS.LOGIN} className="font-mono text-xs flex items-center justify-center gap-1 transition-colors"
        style={{ color: 'var(--cyber-accent-cyan)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-blue)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
      >
        <ArrowLeft size={12} /> Return to Login
      </Link>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--cyber-accent-cyan)' }}>
          // SECURITY CLEARANCE RECOVERY
        </span>
        <h2 className="font-headings text-3xl font-bold mt-1 text-white">Reset Credentials</h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--cyber-text-muted)' }}>
          Provide your registered analyst email address below to receive secure authentication reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>
            Analyst Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="analyst@soc.siemai.io"
            className="input-cyber"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200"
          style={{
            background: loading
              ? 'rgba(0,229,255,0.05)'
              : 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,180,255,0.08) 100%)',
            border: '1px solid rgba(0,229,255,0.3)',
            color: 'var(--cyber-accent-cyan)',
            opacity: loading || !email ? 0.55 : 1,
            cursor: loading || !email ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (!loading && email) e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)';
          }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Dispatching Link...</>
          ) : (
            <><ChevronRight size={14} /> Request Reset Instructions</>
          )}
        </button>
      </form>

      <div className="mt-7 text-center">
        <Link to={PATHS.LOGIN} className="font-mono text-xs flex items-center justify-center gap-1 transition-colors"
          style={{ color: 'var(--cyber-text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-text-bright)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
        >
          <ArrowLeft size={12} /> Back to Login
        </Link>
      </div>
    </div>
  );
}
