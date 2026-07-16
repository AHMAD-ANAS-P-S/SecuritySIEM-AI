/* UnauthorizedPage.jsx — 403 Insufficient security clearance */
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { PATHS } from '@routes/paths';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
      style={{ background: 'var(--cyber-bg-deep)' }}
    >
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: 'var(--threat-critical)' }} />

      <div className="relative z-10 space-y-6">
        <div
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{
            background: 'var(--threat-critical-glow)',
            border: '2px solid var(--threat-critical-border)',
            boxShadow: '0 0 32px var(--threat-critical-glow)',
          }}
        >
          <Lock size={28} style={{ color: 'var(--threat-critical)' }} />
        </div>

        <div>
          <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--threat-critical)' }}>
            Access Denied // Status Code 403
          </div>
          <h1 className="font-headings text-3xl font-bold mb-2" style={{ color: 'var(--cyber-text-bright)' }}>
            Insufficient Clearance Level
          </h1>
          <p className="font-mono text-xs max-w-md mx-auto leading-relaxed" style={{ color: 'var(--cyber-text-muted)' }}>
            You do not possess the required security clearances to access the requested segment.
            Operations on this resource have been logged under the audit timeline.
            Contact your SOC administrator to request elevated credentials.
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
