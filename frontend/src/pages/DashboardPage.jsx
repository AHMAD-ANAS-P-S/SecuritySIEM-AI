/* DashboardPage.jsx — Security Operations Center dashboard with full theme compliance */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Activity, Clock, Monitor, TrendingUp, TrendingDown,
  ChevronRight, RefreshCw, AlertTriangle, BarChart3, Wifi,
  Server, Globe, Zap, ShieldCheck,
} from 'lucide-react';

/* ─── Mock Data ──────────────────────────────────────────────────── */
const KPI_DATA = [
  { id: 'total_alerts', label: 'Security Alerts Detected',  value: 1847,  delta: +12.4, icon: ShieldAlert, color: 'cyan',  unit: '' },
  { id: 'critical',     label: 'Critical Severity Incidents', value: 7,     delta: -2,    icon: AlertTriangle, color: 'red', unit: '' },
  { id: 'mttr',         label: 'Mean Time to Respond',       value: '4.2', delta: -18.5, icon: Clock,    color: 'green', unit: 'min' },
  { id: 'systems',      label: 'Monitored Endpoints',        value: 3412,  delta: +3.1,  icon: Monitor,  color: 'blue',  unit: '' },
];

const SEVERITY_BARS = [
  { label: 'Critical', count: 7,   pct: 5,  color: 'var(--threat-critical)', glow: 'var(--threat-critical-glow)' },
  { label: 'High',     count: 23,  pct: 16, color: 'var(--threat-high)',     glow: 'var(--threat-high-glow)' },
  { label: 'Medium',   count: 84,  pct: 58, color: 'var(--threat-medium)',   glow: 'var(--threat-medium-glow)' },
  { label: 'Low',      count: 31,  pct: 21, color: 'var(--threat-low)',      glow: 'var(--threat-low-glow)' },
];

const RECENT_ALERTS = [
  { id: 'INC-9814', time: '22:47:03', source: '185.220.101.52', dest: 'WKSTN-042',   type: 'Ransomware Execution Detected',     severity: 'critical', status: 'open' },
  { id: 'INC-9813', time: '22:43:18', source: '10.0.14.22',     dest: 'DC-01',       type: 'Brute Force Attack — RDP Protocol', severity: 'high',     status: 'investigating' },
  { id: 'INC-9812', time: '22:31:55', source: '45.33.32.156',   dest: 'WEB-SRV-03', type: 'SQL Injection Attempt',              severity: 'high',     status: 'open' },
  { id: 'INC-9811', time: '22:28:40', source: '10.0.4.88',      dest: 'MAIL-SRV-01',type: 'Suspicious Email Attachment',        severity: 'medium',   status: 'closed' },
  { id: 'INC-9810', time: '22:19:07', source: '192.168.1.105',  dest: 'S3-BUCKET',  type: 'Abnormal Data Exfiltration',        severity: 'high',     status: 'investigating' },
  { id: 'INC-9809', time: '22:08:33', source: '203.0.113.44',   dest: 'API-GW-01',  type: 'API Abuse — Rate Limit Breach',     severity: 'medium',   status: 'closed' },
];

const ENDPOINT_HEALTH = [
  { name: 'WKSTN-042',   status: 'critical', cpu: 98, threat: 'Ransomware' },
  { name: 'DC-01',       status: 'warning',  cpu: 62, threat: 'Brute Force' },
  { name: 'WEB-SRV-03',  status: 'warning',  cpu: 71, threat: 'SQLi Attempt' },
  { name: 'MAIL-SRV-01', status: 'healthy',  cpu: 34, threat: null },
  { name: 'API-GW-01',   status: 'healthy',  cpu: 41, threat: null },
  { name: 'DB-CLUSTER',  status: 'healthy',  cpu: 55, threat: null },
];

const TOP_THREATS = [
  { name: 'Ransomware.WannaCry.v3',  count: 14, severity: 'critical', source: 'External Network' },
  { name: 'Trojan.AgentTesla',        count: 31, severity: 'high',     source: 'Phishing Campaign' },
  { name: 'Exploit.Log4Shell.CVE',    count: 8,  severity: 'high',     source: 'External Network' },
  { name: 'PUA.Cryptominer.XMRig',   count: 22, severity: 'medium',   source: 'Internal Endpoint' },
  { name: 'Backdoor.CobaltStrike',    count: 5,  severity: 'critical', source: 'Supply Chain' },
];

const TRAFFIC_CHART = [
  { hour: '00', value: 420 }, { hour: '02', value: 310 }, { hour: '04', value: 280 },
  { hour: '06', value: 510 }, { hour: '08', value: 890 }, { hour: '10', value: 1240 },
  { hour: '12', value: 1680 }, { hour: '14', value: 1420 }, { hour: '16', value: 1890 },
  { hour: '18', value: 1540 }, { hour: '20', value: 1847 }, { hour: '22', value: 1320 },
];

/* ─── Style Helpers ──────────────────────────────────────────────── */
const SEVERITY_STYLES = {
  critical: { bg: 'var(--threat-critical-glow)',  text: 'var(--threat-critical)', border: 'var(--threat-critical-border)' },
  high:     { bg: 'var(--threat-high-glow)',      text: 'var(--threat-high)',     border: 'var(--threat-high-border)' },
  medium:   { bg: 'var(--threat-medium-glow)',    text: 'var(--threat-medium)',   border: 'var(--threat-medium-border)' },
  low:      { bg: 'var(--threat-low-glow)',       text: 'var(--threat-low)',      border: 'var(--threat-low-border)' },
};

const STATUS_STYLE = {
  open:          { bg: 'var(--threat-critical-glow)', text: 'var(--threat-critical)', border: 'var(--threat-critical-border)' },
  investigating: { bg: 'var(--threat-medium-glow)',   text: 'var(--threat-medium)',   border: 'var(--threat-medium-border)' },
  closed:        { bg: 'var(--threat-low-glow)',      text: 'var(--threat-low)',      border: 'var(--threat-low-border)' },
};

const COLOR_MAP = {
  cyan:  { text: 'var(--cyber-accent-cyan)',   bg: 'var(--cyber-accent-cyan-glow)',   border: 'rgba(0,229,255,0.25)',  glow: 'rgba(0,229,255,0.12)' },
  red:   { text: 'var(--threat-critical)',     bg: 'var(--threat-critical-glow)',     border: 'var(--threat-critical-border)', glow: 'var(--threat-critical-glow)' },
  green: { text: 'var(--threat-low)',          bg: 'var(--threat-low-glow)',          border: 'var(--threat-low-border)',      glow: 'var(--threat-low-glow)' },
  blue:  { text: 'var(--cyber-accent-blue)',   bg: 'var(--cyber-accent-blue-glow)',   border: 'rgba(56,189,248,0.25)', glow: 'rgba(56,189,248,0.12)' },
};

/* ─── Sub-components ─────────────────────────────────────────────── */
function KpiCard({ kpi, delay }) {
  const [count, setCount] = useState(0);
  const c = COLOR_MAP[kpi.color];
  const isPositiveGood = kpi.id === 'mttr' || kpi.id === 'critical' ? kpi.delta < 0 : kpi.delta > 0;

  useEffect(() => {
    const target = typeof kpi.value === 'number' ? kpi.value : parseFloat(kpi.value);
    const step = target / 40;
    let current = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        setCount(current);
        if (current >= target) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }, delay * 150);
    return () => clearTimeout(timer);
  }, [kpi.value, delay]);

  const displayVal = typeof kpi.value === 'number'
    ? Math.round(count).toLocaleString()
    : count.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className="rounded-xl p-5 relative overflow-hidden cyber-glow-card"
      style={{
        background: 'var(--cyber-bg-panel)',
        border: '1px solid var(--cyber-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Glow blob top-right */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
        style={{ background: c.glow }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.text}, transparent)`, opacity: 0.4 }} />

      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <kpi.icon size={18} style={{ color: c.text }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isPositiveGood ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositiveGood ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {Math.abs(kpi.delta)}%
        </div>
      </div>

      <div className="font-mono text-3xl font-bold mb-1" style={{ color: c.text }}>
        {displayVal}
        <span className="text-sm font-normal ml-1" style={{ color: 'var(--cyber-text-muted)' }}>{kpi.unit}</span>
      </div>
      <div className="font-sans text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cyber-text-muted)' }}>
        {kpi.label}
      </div>
    </motion.div>
  );
}

function SeverityBar({ item, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(item.pct), 400 + delay * 120);
    return () => clearTimeout(t);
  }, [item.pct, delay]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs" style={{ color: 'var(--cyber-text-muted)' }}>{item.label}</span>
        <span className="font-mono text-xs font-bold" style={{ color: item.color }}>{item.count}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cyber-bg-accent)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: item.color,
            boxShadow: `0 0 8px ${item.glow}`,
          }}
        />
      </div>
    </div>
  );
}

function TrafficSparkline() {
  const max = Math.max(...TRAFFIC_CHART.map(d => d.value));
  const W = 500, H = 90;
  const pts = TRAFFIC_CHART.map((d, i) => ({
    x: (i / (TRAFFIC_CHART.length - 1)) * W,
    y: H - (d.value / max) * (H - 8) - 4,
  }));

  // Smooth cubic bezier path
  const path = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  const area = `${path} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyber-accent-cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyber-accent-cyan)" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="var(--cyber-accent-cyan)" strokeWidth="1.5" filter="url(#glow)" />
      {/* Peak point indicator */}
      {pts.map((p, i) => {
        const isPeak = TRAFFIC_CHART[i].value === max;
        if (!isPeak) return null;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--cyber-accent-cyan)" opacity="0.9" />
            <circle cx={p.x} cy={p.y} r="8" fill="var(--cyber-accent-cyan)" opacity="0.15" />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Panel wrapper with consistent theme styling ────────────────── */
function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'var(--cyber-bg-panel)',
        border: '1px solid var(--cyber-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('Just now');

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh('Just now'); }, 1200);
  };

  return (
    <div className="p-5 lg:p-7 space-y-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--threat-critical)' }}>
              Threat Level: Elevated
            </span>
          </div>
          <h1 className="page-title font-headings">Security Operations Center</h1>
          <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--cyber-text-muted)' }}>
            Telemetry Window: Last 24 Hours &nbsp;·&nbsp; Updated: {lastRefresh}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all duration-200 btn-cyber btn-cyber-secondary"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh Telemetry
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi, i) => <KpiCard key={kpi.id} kpi={kpi} delay={i} />)}
      </div>

      {/* Middle row: Alert volume chart + Severity distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Alert volume sparkline */}
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--cyber-border-muted)' }}>
            <div>
              <h2 className="section-heading">
                <BarChart3 size={16} style={{ color: 'var(--cyber-accent-cyan)' }} />
                Incident Volume Telemetry
              </h2>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                Alert event volume — 2-hour rolling window
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cyber-accent-cyan)', boxShadow: '0 0 6px var(--cyber-accent-cyan)' }} />
              <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>Events/2hr</span>
            </div>
          </div>
          <div className="px-5 py-4">
            {/* Grid pattern background */}
            <div className="relative rounded-lg overflow-hidden" style={{ background: 'var(--cyber-bg-input)', border: '1px solid var(--cyber-border-muted)' }}>
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: 'linear-gradient(to right, var(--cyber-border-muted) 1px, transparent 1px), linear-gradient(to bottom, var(--cyber-border-muted) 1px, transparent 1px)', backgroundSize: '40px 20px' }}
              />
              <div className="relative h-24 px-2 pt-2">
                <TrafficSparkline />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {TRAFFIC_CHART.filter((_, i) => i % 2 === 0).map(d => (
                <span key={d.hour} className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-dim)' }}>{d.hour}:00</span>
              ))}
            </div>
          </div>
        </Panel>

        {/* Severity distribution */}
        <Panel>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cyber-border-muted)' }}>
            <h2 className="section-heading">
              <ShieldAlert size={16} style={{ color: 'var(--threat-high)' }} />
              Severity Distribution
            </h2>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
              Active incidents — 24hr analysis window
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {SEVERITY_BARS.map((item, i) => <SeverityBar key={item.label} item={item} delay={i} />)}
            <div className="pt-3" style={{ borderTop: '1px solid var(--cyber-border-muted)' }}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--cyber-text-muted)' }}>Total Active Incidents</span>
                <span className="font-mono text-lg font-bold" style={{ color: 'var(--cyber-text-bright)' }}>145</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom row: Recent Alerts + Endpoint Health + Top Threats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent alerts table */}
        <Panel className="lg:col-span-3">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--cyber-border-muted)' }}>
            <div>
              <h2 className="section-heading">
                <Zap size={15} style={{ color: 'var(--cyber-accent-cyan)' }} />
                Live Security Alert Feed
              </h2>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                Real-time event stream — last 6 detected incidents
              </p>
            </div>
            <button className="font-mono text-[10px] flex items-center gap-1 transition-colors"
              style={{ color: 'var(--cyber-accent-cyan)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
            >
              View All Incidents <ChevronRight size={10} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-cyber w-full">
              <thead>
                <tr>
                  {['Incident ID', 'UTC Time', 'Threat Type', 'Severity', 'Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ALERTS.map((alert, i) => {
                  const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
                  const st  = STATUS_STYLE[alert.status];
                  return (
                    <motion.tr key={alert.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="cursor-pointer"
                    >
                      <td className="font-mono text-xs font-bold" style={{ color: 'var(--cyber-accent-cyan)' }}>{alert.id}</td>
                      <td className="font-mono text-xs" style={{ color: 'var(--cyber-text-muted)' }}>{alert.time}</td>
                      <td className="font-mono text-xs max-w-[160px] truncate" style={{ color: 'var(--cyber-text-base)' }}>{alert.type}</td>
                      <td>
                        <span className="badge-cyber"
                          style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <span className="badge-cyber"
                          style={{ background: st.bg, color: st.text, borderColor: st.border }}>
                          {alert.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Right column: Endpoints + Top Threats */}
        <div className="lg:col-span-2 space-y-4">

          {/* Endpoint threat status */}
          <Panel>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cyber-border-muted)' }}>
              <h2 className="section-heading">
                <Server size={15} style={{ color: 'var(--cyber-accent-blue)' }} />
                Endpoint Threat Status
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {ENDPOINT_HEALTH.map(ep => (
                <div
                  key={ep.name}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: 'var(--cyber-bg-accent)',
                    border: '1px solid var(--cyber-border-muted)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ep.status === 'critical' ? 'animate-pulse' : ep.status === 'warning' ? 'animate-pulse' : ''
                    }`}
                      style={{
                        background: ep.status === 'critical' ? 'var(--threat-critical)' :
                                    ep.status === 'warning'  ? 'var(--threat-high)' : 'var(--threat-low)',
                        boxShadow: ep.status !== 'healthy' ? `0 0 6px ${ep.status === 'critical' ? 'var(--threat-critical)' : 'var(--threat-high)'}` : 'none',
                      }}
                    />
                    <div>
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--cyber-text-bright)' }}>{ep.name}</p>
                      {ep.threat && (
                        <p className="font-mono text-[9px]" style={{ color: 'var(--threat-critical)' }}>{ep.threat}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold"
                      style={{ color: ep.cpu > 80 ? 'var(--threat-critical)' : ep.cpu > 60 ? 'var(--threat-high)' : 'var(--cyber-text-muted)' }}>
                      {ep.cpu}%
                    </span>
                    <p className="font-mono text-[8px]" style={{ color: 'var(--cyber-text-dim)' }}>CPU</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Active threat intelligence */}
          <Panel>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cyber-border-muted)' }}>
              <h2 className="section-heading">
                <Globe size={15} style={{ color: 'var(--threat-medium)' }} />
                Active Threat Intelligence
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {TOP_THREATS.map((t, i) => {
                const sev = SEVERITY_STYLES[t.severity] || SEVERITY_STYLES.low;
                return (
                  <div key={t.name} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] w-4 flex-shrink-0 pt-0.5" style={{ color: 'var(--cyber-text-dim)' }}>{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs truncate font-medium" style={{ color: 'var(--cyber-text-base)' }}>{t.name}</p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>{t.source}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="badge-cyber"
                        style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}>
                        {t.severity}
                      </span>
                      <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--cyber-text-muted)' }}>×{t.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
