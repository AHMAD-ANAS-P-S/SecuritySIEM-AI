/* ProfilePage.jsx — Analyst Profile Page */
import { ShieldAlert, Activity, Clock, Calendar, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@hooks';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@routes/paths';

const ACTIVITY_LOG = [
  { action: 'Escalated INC-9812 to Critical severity status', time: '22:43', date: 'Today' },
  { action: 'Closed INC-9808 — Verified False Positive', time: '21:15', date: 'Today' },
  { action: 'Executed custom KQL query threat hunting logs', time: '20:30', date: 'Today' },
  { action: 'Assigned INC-9800 investigation to J. Rivera', time: '18:52', date: 'Today' },
  { action: 'Updated SOAR playbook rule: Auto-Isolate Endpoint', time: '16:11', date: 'Today' },
  { action: 'Investigated incident INC-9795 — Phishing Campaign', time: '14:30', date: 'Yesterday' },
];

export default function ProfilePage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Analyst-42';
  const displayEmail = user?.email || 'analyst42@siemai.io';
  const initials = displayName.charAt(0).toUpperCase() || 'A';

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.LOGIN, { replace: true });
  };

  return (
    <div className="p-5 lg:p-7 max-w-4xl space-y-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>
      <h1 className="page-title font-headings">Analyst Operations Profile</h1>

      {/* Profile Details Panel */}
      <div
        className="rounded-xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--cyber-bg-panel)',
          border: '1px solid var(--cyber-border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="absolute -top-10 -right-10 w-42 h-42 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'var(--cyber-accent-cyan)' }} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-headings font-bold text-slate-950"
                style={{ background: 'linear-gradient(135deg, var(--cyber-accent-cyan), var(--cyber-accent-blue))' }}>
                {initials}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2"
                style={{ borderColor: 'var(--cyber-bg-panel)' }} />
            </div>
            {/* Analyst Credentials */}
            <div>
              <h2 className="font-headings text-2xl font-bold" style={{ color: 'var(--cyber-text-bright)' }}>{displayName}</h2>
              <p className="font-mono text-xs font-semibold uppercase mt-0.5" style={{ color: 'var(--cyber-accent-cyan)' }}>
                Senior Security Analyst (Tier-3 SOC)
              </p>
              <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                Identity Access ID: {displayEmail}
              </p>
              <div className="flex flex-wrap gap-2 mt-3.5">
                {['CLEARANCE: LEVEL 3', 'SOAR PLAYBOOK CERTIFIED', 'THREAT HUNTING SPECIALIST'].map(badge => (
                  <span key={badge} className="badge-cyber"
                    style={{
                      background: 'var(--cyber-accent-cyan-glow)',
                      color: 'var(--cyber-accent-cyan)',
                      borderColor: 'rgba(0, 229, 255, 0.25)',
                    }}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider btn-cyber btn-cyber-danger flex-shrink-0"
          >
            <LogOut size={13} /> Terminate Session
          </button>
        </div>

        {/* Operational Telemetry Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--cyber-border-muted)' }}>
          {[
            { label: 'Incidents Closed', value: '284', icon: ShieldAlert, color: 'var(--cyber-accent-cyan)' },
            { label: 'Avg Mean Time to Respond (MTTR)', value: '3.8m', icon: Clock, color: 'var(--threat-low)' },
            { label: 'Sec Alerts Assessed / Day', value: '47', icon: Activity, color: 'var(--cyber-accent-blue)' },
            { label: 'Months Active', value: '14', icon: Calendar, color: 'var(--cyber-accent-violet)' },
          ].map(s => (
            <div key={s.label} className="text-center md:text-left rounded-lg p-3" style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
              <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="font-mono text-[9px] text-slate-500 mt-1 uppercase tracking-wider leading-normal">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Timeline / Recent Activity */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--cyber-bg-panel)',
          border: '1px solid var(--cyber-border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2 className="section-heading mb-6">
          <Activity size={16} style={{ color: 'var(--cyber-accent-cyan)' }} />
          Audit Timeline — Security Activity Logs
        </h2>
        <div className="space-y-4">
          {ACTIVITY_LOG.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{
                    background: 'var(--cyber-accent-cyan)',
                    boxShadow: '0 0 6px var(--cyber-accent-cyan-glow)',
                  }}
                />
                {i < ACTIVITY_LOG.length - 1 && (
                  <div className="w-px flex-1 my-1.5" style={{ background: 'var(--cyber-border-muted)', minHeight: '24px' }} />
                )}
              </div>
              <div className="pb-2">
                <p className="font-mono text-xs" style={{ color: 'var(--cyber-text-base)' }}>{item.action}</p>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
                  {item.date} at {item.time} UTC
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
