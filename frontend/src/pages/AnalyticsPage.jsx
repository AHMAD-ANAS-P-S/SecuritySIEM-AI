/* AnalyticsPage.jsx — Deep analytics with charts, heatmaps, and trend analysis */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart2, TrendingUp, TrendingDown, Globe, Cpu, Clock,
  RefreshCw, Calendar, ChevronDown, Activity, Zap, Shield,
  AlertTriangle, Database, Filter,
} from 'lucide-react';

/* ─── Mock data ───────────────────────────────────────────────────── */
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const generateHeatmapData = () =>
  DAYS.map(day => ({
    day,
    hours: HOURS.map(hour => ({
      hour,
      value: Math.floor(Math.random() * 100),
      events: Math.floor(Math.random() * 500),
    })),
  }));

const HEATMAP_DATA = generateHeatmapData();

const ATTACK_SOURCES = [
  { country: 'Russia (RU)', flag: '🇷🇺', count: 487, pct: 31, color: '#ef4444' },
  { country: 'China (CN)', flag: '🇨🇳', count: 312, pct: 20, color: '#f97316' },
  { country: 'North Korea (KP)', flag: '🇰🇵', count: 198, pct: 13, color: '#eab308' },
  { country: 'Iran (IR)', flag: '🇮🇷', count: 156, pct: 10, color: '#a855f7' },
  { country: 'United States (US)', flag: '🇺🇸', count: 134, pct: 9, color: '#4d9fff' },
  { country: 'Other', flag: '🌐', count: 265, pct: 17, color: '#64748b' },
];

const TREND_DATA = {
  '7d': [
    { label: 'Mon', events: 1240, critical: 3, high: 12 },
    { label: 'Tue', events: 1680, critical: 7, high: 18 },
    { label: 'Wed', events: 940, critical: 1, high: 8 },
    { label: 'Thu', events: 2100, critical: 12, high: 31 },
    { label: 'Fri', events: 1847, critical: 7, high: 23 },
    { label: 'Sat', events: 820, critical: 2, high: 9 },
    { label: 'Sun', events: 610, critical: 0, high: 6 },
  ],
  '30d': Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    events: Math.floor(Math.random() * 2500 + 500),
    critical: Math.floor(Math.random() * 15),
    high: Math.floor(Math.random() * 40),
  })),
};

const ATTACK_CATEGORIES = [
  { name: 'Malware', count: 612, pct: 33, color: '#ef4444', delta: +8.2 },
  { name: 'Network Intrusion', count: 487, pct: 26, color: '#f97316', delta: -3.1 },
  { name: 'Phishing', count: 334, pct: 18, color: '#eab308', delta: +15.4 },
  { name: 'Credential Attack', count: 223, pct: 12, color: '#a855f7', delta: +2.7 },
  { name: 'Data Exfiltration', count: 134, pct: 7, color: '#4d9fff', delta: -11.2 },
  { name: 'Other', count: 57, pct: 3, color: '#64748b', delta: +0.5 },
];

const MTTR_TREND = [52, 48, 61, 39, 44, 38, 42, 35, 41, 38, 35, 30]; // minutes
const DETECTION_TREND = [88, 91, 87, 93, 89, 94, 92, 95, 91, 96, 94, 97]; // percentage

const KPI_METRICS = [
  { label: 'Mean Time to Detect', value: '14.3', unit: 'min', delta: -22, good: true, icon: Clock, color: '#22c55e' },
  { label: 'Mean Time to Respond', value: '32.1', unit: 'min', delta: -38, good: true, icon: Zap, color: '#4d9fff' },
  { label: 'Detection Rate', value: '97.4', unit: '%', delta: +9.2, good: true, icon: Shield, color: '#00f5ff' },
  { label: 'False Positive Rate', value: '3.8', unit: '%', delta: -41, good: true, icon: AlertTriangle, color: '#a855f7' },
];

/* ─── Sub-components ─────────────────────────────────────────────── */
function Heatmap({ data }) {
  const getColor = (value) => {
    if (value === 0) return 'rgba(255,255,255,0.03)';
    if (value < 20) return 'rgba(0,245,255,0.12)';
    if (value < 40) return 'rgba(0,245,255,0.25)';
    if (value < 60) return 'rgba(249,115,22,0.35)';
    if (value < 80) return 'rgba(239,68,68,0.45)';
    return 'rgba(239,68,68,0.7)';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex mb-1 ml-10">
          {HOURS.filter((_, i) => i % 3 === 0).map(h => (
            <div key={h} className="flex-1 text-center font-mono text-[8px] text-slate-600">{h}:00</div>
          ))}
        </div>
        {/* Grid */}
        {data.map(row => (
          <div key={row.day} className="flex items-center gap-0.5 mb-0.5">
            <span className="font-mono text-[9px] text-slate-500 w-9 flex-shrink-0">{row.day}</span>
            {row.hours.map(cell => (
              <div
                key={cell.hour}
                className="flex-1 rounded-sm cursor-pointer transition-all duration-150 hover:scale-110 group relative"
                style={{ height: '22px', background: getColor(cell.value) }}
                title={`${row.day} ${cell.hour}:00 — ${cell.events} events`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[8px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                  style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                  {cell.events} events
                </div>
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 ml-10">
          <span className="font-mono text-[9px] text-slate-600">Low</span>
          {['rgba(0,245,255,0.12)', 'rgba(0,245,255,0.25)', 'rgba(249,115,22,0.35)', 'rgba(239,68,68,0.45)', 'rgba(239,68,68,0.7)'].map((c, i) => (
            <div key={i} className="w-5 h-3 rounded-sm" style={{ background: c }} />
          ))}
          <span className="font-mono text-[9px] text-slate-600">High</span>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, range }) {
  const maxEvents = Math.max(...data.map(d => d.events));
  const displayed = range === '7d' ? data : data.slice(-14);

  return (
    <div className="flex items-end gap-1 h-32">
      {displayed.map((d, i) => (
        <motion.div
          key={i}
          className="flex-1 flex flex-col items-center gap-0.5 group"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
        >
          <div className="w-full relative flex flex-col justify-end" style={{ height: '112px' }}>
            {/* Critical overlay */}
            <div className="w-full rounded-t-sm opacity-70"
              style={{ height: `${(d.critical / maxEvents) * 112}px`, background: '#ef4444' }} />
            {/* High overlay */}
            <div className="w-full"
              style={{ height: `${((d.high - d.critical) / maxEvents) * 112}px`, background: '#f97316' }} />
            {/* Base */}
            <div className="w-full rounded-b-sm"
              style={{
                height: `${((d.events - d.high) / maxEvents) * 112}px`,
                background: 'rgba(0,245,255,0.3)',
              }} />
          </div>
          <span className="font-mono text-[7px] text-slate-600 truncate w-full text-center">{d.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function LineSparkline({ data, color, height = 48 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 200, H = height;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`lg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lg-${color.slice(1)})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={14} style={{ color: '#00f5ff' }} />
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Threat Intelligence Platform</span>
          </div>
          <h1 className="text-xl font-bold text-white">Threat Intelligence &amp; Analytics</h1>
          <p className="font-mono text-[10px] text-slate-500 mt-0.5">Operational security metrics, adversarial pattern analysis, and vulnerability exposure reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['7d', '30d'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className="px-3 py-2 font-mono text-[10px] transition-all duration-200"
                style={{
                  background: timeRange === r ? 'rgba(0,245,255,0.15)' : 'transparent',
                  color: timeRange === r ? '#00f5ff' : '#64748b',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-15 blur-xl"
              style={{ background: m.color }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                <m.icon size={14} style={{ color: m.color }} />
              </div>
              <div className={`flex items-center gap-1 font-mono text-[10px] font-bold ${m.good ? 'text-green-400' : 'text-red-400'}`}>
                {m.delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(m.delta)}%
              </div>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: m.color }}>
              {m.value}<span className="text-sm font-normal text-slate-500 ml-1">{m.unit}</span>
            </p>
            <p className="font-mono text-[9px] text-slate-500 mt-1 uppercase tracking-wide">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Event Volume Bar Chart */}
      <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-100 text-sm">Security Event Telemetry Volume</h2>
            <p className="font-mono text-[10px] text-slate-500">{timeRange === '7d' ? 'Last 7-day detection window' : 'Last 30-day detection window'}</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { color: '#ef4444', label: 'Critical' },
              { color: '#f97316', label: 'High' },
              { color: 'rgba(0,245,255,0.5)', label: 'Other' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="font-mono text-[9px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <BarChart data={TREND_DATA[timeRange]} range={timeRange} />
      </div>

      {/* Attack Heatmap */}
      <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-100 text-sm">Adversarial Activity Heatmap</h2>
            <p className="font-mono text-[10px] text-slate-500">Threat event density by day-of-week and hour-of-day (UTC)</p>
          </div>
        </div>
        <Heatmap data={HEATMAP_DATA} />
      </div>

      {/* Bottom row: Geo + Categories + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Attack Sources */}
        <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          <h2 className="font-bold text-slate-100 text-sm mb-4">Threat Origin Geolocation</h2>
          <div className="space-y-3">
            {ATTACK_SOURCES.map(src => (
              <div key={src.country}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{src.flag}</span>
                    <span className="font-mono text-[10px] text-slate-300">{src.country}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: src.color }}>{src.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${src.pct}%` }}
                    transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: src.color, boxShadow: `0 0 6px ${src.color}40` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attack Categories */}
        <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          <h2 className="font-bold text-slate-100 text-sm mb-4">Adversarial Technique Classification</h2>
          <div className="space-y-3">
            {ATTACK_CATEGORIES.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-slate-300">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] ${cat.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {cat.delta > 0 ? '+' : ''}{cat.delta}%
                    </span>
                    <span className="font-mono text-[10px] font-bold text-white">{cat.count}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}40` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MTTR & Detection trends */}
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-[13px]">Mean Time to Respond (MTTR)</h3>
                <p className="font-mono text-[9px] text-slate-500">Resolution latency (min) — trailing 12 weeks</p>
              </div>
              <span className="font-mono text-xl font-bold text-green-400">30 <span className="text-sm font-normal text-slate-500">min</span></span>
            </div>
            <LineSparkline data={MTTR_TREND} color="#22c55e" height={48} />
          </div>
          <div className="rounded-xl p-5" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-[13px]">Threat Detection Efficacy</h3>
                <p className="font-mono text-[9px] text-slate-500">Coverage rate (%) — trailing 12 weeks</p>
              </div>
              <span className="font-mono text-xl font-bold text-cyan-400">97% <span className="text-sm font-normal text-slate-500"></span></span>
            </div>
            <LineSparkline data={DETECTION_TREND} color="#00f5ff" height={48} />
          </div>
        </div>
      </div>
    </div>
  );
}
