/* AuthLayout.jsx — Enterprise cybersecurity split-panel authentication wrapper */
import { Outlet } from 'react-router-dom';
import { ShieldAlert, Activity, Lock, Eye, Cpu, Server, Globe } from 'lucide-react';

const THREAT_STATS = [
  { label: 'Threat Events Blocked (24h)',  value: '14,782', color: 'var(--cyber-accent-cyan)' },
  { label: 'Analysts Currently Online',    value: '238',    color: 'var(--threat-low)' },
  { label: 'Avg. Mean Detection Time',     value: '1.4s',   color: 'var(--cyber-accent-blue)' },
  { label: 'Critical Incidents Active',    value: '7',      color: 'var(--threat-critical)' },
];

const PLATFORM_FEATURES = [
  { icon: Eye,      text: 'Real-time event monitoring across 500+ heterogeneous data sources' },
  { icon: Activity, text: 'ML-powered behavioral anomaly detection with <0.1% false positive rate' },
  { icon: Cpu,      text: 'Automated SOAR playbook execution for sub-minute incident response' },
  { icon: Lock,     text: 'SOC 2 Type II & ISO 27001 certified — Zero Trust architecture enforced' },
  { icon: Globe,    text: 'Global threat intelligence correlation across 4.2B+ IOC entries' },
  { icon: Server,   text: '99.99% SLA uptime — Multi-region high-availability infrastructure' },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* ── Left brand panel — hidden on mobile ────────────────── */}
      <div
        className="hidden lg:flex lg:w-[520px] xl:w-[600px] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #080f1e 0%, #030712 100%)',
          borderRight: '1px solid rgba(0,229,255,0.08)',
        }}
      >
        {/* Animated cyber grid overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,255,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Scan line animation */}
        <div
          className="absolute left-0 right-0 h-px opacity-15 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.9), transparent)',
            animation: 'scanLine 7s linear infinite',
          }}
        />

        {/* Radial glow blob */}
        <div
          className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00e5ff, transparent 70%)' }}
        />

        {/* ── Logo & Brand ── */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,180,255,0.08) 100%)',
                border: '1px solid rgba(0,229,255,0.3)',
                boxShadow: '0 0 24px rgba(0,229,255,0.2)',
              }}
            >
              <ShieldAlert size={24} style={{ color: '#00e5ff' }} />
            </div>
            <div>
              <h1 className="font-mono text-xl font-bold text-white tracking-wider">
                SIEM <span style={{ color: '#00e5ff' }}>AI</span>
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Enterprise Security Operations Platform
              </p>
            </div>
          </div>
        </div>

        {/* ── Center Content ── */}
        <div className="relative z-10 space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5"
              style={{
                background: 'rgba(0,229,255,0.06)',
                border: '1px solid rgba(0,229,255,0.15)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(0,229,255,0.7)' }}>
                All Systems Operational
              </span>
            </div>

            <h2 className="font-headings text-4xl font-bold text-white leading-tight mb-4">
              AI-Powered<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #00e5ff 0%, #4d9fff 60%, #a78bfa 100%)' }}
              >
                Threat Intelligence
              </span>
            </h2>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Enterprise SIEM with machine learning threat detection, SOAR automation, and AI-assisted analyst tooling built for the modern SOC.
            </p>
          </div>

          {/* Live platform stats */}
          <div className="grid grid-cols-2 gap-3">
            {THREAT_STATS.map(stat => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--cyber-border-subtle)',
                }}
              >
                <div className="font-mono text-xl font-bold mb-1" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider leading-tight"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {PLATFORM_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(0,229,255,0.08)',
                    border: '1px solid rgba(0,229,255,0.18)',
                  }}
                >
                  <Icon size={11} style={{ color: '#00e5ff' }} />
                </div>
                <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="relative z-10">
          <p className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © 2026 SIEM AI — Enterprise Security Operations Platform — All Rights Reserved
          </p>
        </div>
      </div>

      {/* ── Right auth form panel ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo — hidden on desktop */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.25)',
              }}
            >
              <ShieldAlert size={18} style={{ color: '#00e5ff' }} />
            </div>
            <span className="font-mono text-base font-bold" style={{ color: 'var(--cyber-text-bright)' }}>
              SIEM <span style={{ color: '#00e5ff' }}>AI</span>
            </span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
