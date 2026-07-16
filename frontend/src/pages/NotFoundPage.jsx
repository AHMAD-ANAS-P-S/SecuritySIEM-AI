/* NotFoundPage.jsx — Branded 404 access vector not found page */
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { PATHS } from '@routes/paths';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
      style={{ background: 'var(--cyber-bg-deep)' }}
    >
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: 'var(--cyber-accent-cyan)' }} />

      {/* Animated glitch number */}
      <div className="mb-6 relative z-10">
        <div className="font-headings text-[110px] font-black leading-none select-none relative"
          style={{ color: 'var(--cyber-border-subtle)', opacity: 0.12 }}>
          404
          <span className="absolute inset-0 font-headings text-[110px] font-black leading-none animate-[glitch_4s_ease-in-out_infinite]"
            style={{
              color: 'var(--cyber-accent-cyan)',
              textShadow: '0 0 20px var(--cyber-accent-cyan-glow), 0 0 60px rgba(0,229,255,0.15)',
            }}>
            404
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        <div
          className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center"
          style={{
            background: 'var(--threat-critical-glow)',
            border: '1px solid var(--threat-critical-border)',
            boxShadow: '0 0 16px var(--threat-critical-glow)',
          }}
        >
          <ShieldAlert size={24} style={{ color: 'var(--threat-critical)' }} />
        </div>

        <div>
          <h1 className="font-headings text-3xl font-bold mb-2" style={{ color: 'var(--cyber-text-bright)' }}>
            Access Vector Not Found
          </h1>
          <p className="font-mono text-xs max-w-md mx-auto leading-relaxed" style={{ color: 'var(--cyber-text-muted)' }}>
            Error Code: HTTP_404_NOT_FOUND &nbsp;·&nbsp; Severity: Low<br />
            The requested resource or endpoint path does not exist within the active security perimeter.
          </p>
        </div>

        <button
          onClick={() => navigate(PATHS.DASHBOARD)}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-200 btn-cyber btn-cyber-outline"
        >
          <ArrowLeft size={13} /> Return to Operations Center
        </button>
      </div>
    </div>
  );
}
