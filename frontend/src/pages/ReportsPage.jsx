/* ReportsPage.jsx — Audit reports with compliance tracking and scheduled generation */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Clock, CheckCircle, AlertCircle, RefreshCw,
  Plus, Filter, Search, Calendar, Shield, Globe, Cpu, Database,
  ChevronRight, BarChart2, PieChart, TrendingUp, Lock, Eye,
} from 'lucide-react';

/* ─── Mock data ───────────────────────────────────────────────────── */
const COMPLIANCE_FRAMEWORKS = [
  { id: 'soc2', name: 'SOC 2 Type II', score: 94, controls: 117, passed: 110, status: 'compliant' },
  { id: 'iso27001', name: 'ISO 27001', score: 88, controls: 93, passed: 82, status: 'compliant' },
  { id: 'pci', name: 'PCI DSS v4.0', score: 76, controls: 264, passed: 201, status: 'partial' },
  { id: 'hipaa', name: 'HIPAA', score: 91, controls: 45, passed: 41, status: 'compliant' },
  { id: 'nist', name: 'NIST CSF 2.0', score: 83, controls: 108, passed: 90, status: 'compliant' },
];

const REPORT_CATALOG = [
  {
    id: 'r1', name: 'Weekly SOC Executive Summary',
    description: 'High-level threat metrics, incident summary, and trend analysis for leadership',
    type: 'Executive', frequency: 'Weekly', lastRun: '2 days ago', size: '2.1 MB', status: 'ready', pages: 12,
    tags: ['Executive', 'Threats', 'Trends'],
  },
  {
    id: 'r2', name: 'Compliance Status Report — Q3 2025',
    description: 'Consolidated compliance posture across SOC 2, ISO 27001, PCI DSS, and HIPAA',
    type: 'Compliance', frequency: 'Quarterly', lastRun: '5 days ago', size: '8.4 MB', status: 'ready', pages: 47,
    tags: ['Compliance', 'SOC2', 'PCI'],
  },
  {
    id: 'r3', name: 'Incident Response After-Action Report',
    description: 'Post-incident analysis for ALT-9814 ransomware execution including timeline and root cause',
    type: 'Incident', frequency: 'On-Demand', lastRun: '1 day ago', size: '3.7 MB', status: 'ready', pages: 28,
    tags: ['Incident', 'Ransomware', 'RCA'],
  },
  {
    id: 'r4', name: 'Monthly Threat Intelligence Brief',
    description: 'Emerging threat actors, IOCs, CVE advisories and geo-political threat landscape',
    type: 'Intelligence', frequency: 'Monthly', lastRun: '12 days ago', size: '5.2 MB', status: 'ready', pages: 31,
    tags: ['Threat Intel', 'IOCs', 'CVEs'],
  },
  {
    id: 'r5', name: 'Vulnerability Management Summary',
    description: 'Active CVEs by severity, patch coverage, and exploitability scoring across 3,412 assets',
    type: 'Vulnerability', frequency: 'Weekly', lastRun: 'Generating…', size: null, status: 'generating', pages: null,
    tags: ['Vuln Mgmt', 'Patching', 'CVEs'],
  },
  {
    id: 'r6', name: 'User Behavior Analytics Report',
    description: 'Anomalous user activity, privilege abuse, and insider threat indicators',
    type: 'UBA', frequency: 'Monthly', lastRun: '3 days ago', size: '4.1 MB', status: 'ready', pages: 24,
    tags: ['UBA', 'Insider Threat', 'UEBA'],
  },
];

const SCHEDULED = [
  { name: 'SOC Executive Summary', next: 'Mon, Jul 21 · 08:00', frequency: 'Weekly', recipients: 4 },
  { name: 'Compliance Snapshot', next: 'Jul 31 · 09:00', frequency: 'Monthly', recipients: 7 },
  { name: 'Threat Intelligence Brief', next: 'Aug 1 · 07:30', frequency: 'Monthly', recipients: 5 },
];

const TYPE_COLORS = {
  Executive:     { text: '#a855f7', bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.25)' },
  Compliance:    { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  Incident:      { text: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  Intelligence:  { text: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
  Vulnerability: { text: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)' },
  UBA:           { text: '#00f5ff', bg: 'rgba(0,245,255,0.1)',   border: 'rgba(0,245,255,0.25)' },
};

/* ─── Donut ──────────────────────────────────────────────────────── */
function ComplianceDonut({ score, color }) {
  const r = 28, cx = 36, cy = 36, sw = 7;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="monospace">
        {score}%
      </text>
    </svg>
  );
}

const DONUT_COLORS = { compliant: '#22c55e', partial: '#eab308', nonCompliant: '#ef4444' };

/* ─── Main Component ─────────────────────────────────────────────── */
export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [generating, setGenerating] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog');

  const filtered = REPORT_CATALOG.filter(r => {
    const matchType = filterType === 'all' || r.type === filterType;
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleGenerate = (id) => {
    setGenerating(id);
    setTimeout(() => setGenerating(null), 2500);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} style={{ color: '#00f5ff' }} />
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Incident Documentation &amp; Compliance</span>
          </div>
          <h1 className="text-xl font-bold text-white">Incident Reports &amp; Compliance</h1>
          <p className="font-mono text-[10px] text-slate-500 mt-0.5">Automated incident documentation, regulatory compliance reports, and forensic audit trail exports</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] text-cyan-400 font-bold hover:text-cyan-200 transition-colors"
          style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)' }}>
          <Plus size={13} /> Custom Report
        </button>
      </div>

      {/* Compliance scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {COMPLIANCE_FRAMEWORKS.map(fw => (
          <motion.div
            key={fw.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="rounded-xl p-4 text-center cursor-pointer transition-all duration-200"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
          >
            <ComplianceDonut score={fw.score} color={DONUT_COLORS[fw.status]} />
            <p className="font-mono text-[10px] font-bold text-slate-200 mt-2 leading-tight">{fw.name}</p>
            <p className="font-mono text-[9px] text-slate-600 mt-0.5">{fw.passed}/{fw.controls} controls</p>
            <span className="inline-block mt-1.5 font-mono text-[8px] px-2 py-0.5 rounded-full capitalize"
              style={{
                background: fw.status === 'compliant' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                color: fw.status === 'compliant' ? '#22c55e' : '#eab308',
                border: `1px solid ${fw.status === 'compliant' ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`,
              }}>
              {fw.status}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { id: 'catalog', label: 'Report Catalog' },
          { id: 'scheduled', label: 'Scheduled' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-200"
            style={{
              color: activeTab === tab.id ? '#00f5ff' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #00f5ff' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={12} className="text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search incident reports, compliance frameworks, or report type…"
                className="bg-transparent font-mono text-[11px] text-slate-200 placeholder-slate-600 outline-none flex-1"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all', ...Object.keys(TYPE_COLORS)].map(type => {
                const tc = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize transition-all duration-200"
                    style={{
                      background: filterType === type ? (tc?.bg || 'rgba(0,245,255,0.15)') : 'rgba(255,255,255,0.03)',
                      color: filterType === type ? (tc?.text || '#00f5ff') : '#64748b',
                      border: `1px solid ${filterType === type ? (tc?.border || 'rgba(0,245,255,0.3)') : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((report, i) => {
              const tc = TYPE_COLORS[report.type];
              const isGenerating = generating === report.id || report.status === 'generating';
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-5"
                  style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded capitalize"
                          style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
                          {report.type}
                        </span>
                        <span className="font-mono text-[9px] text-slate-600">{report.frequency}</span>
                      </div>
                      <h3 className="font-bold text-slate-100 text-[13px] leading-snug">{report.name}</h3>
                    </div>
                    {report.pages && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono text-[10px] font-bold text-slate-300">{report.pages}p</p>
                        <p className="font-mono text-[9px] text-slate-600">{report.size}</p>
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 mb-3 leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {report.tags.map(tag => (
                      <span key={tag} className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid var(--cyber-border-subtle)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-600" />
                      <span className="font-mono text-[9px] text-slate-600">Last: {report.lastRun}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'ready' && (
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] text-slate-400 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Eye size={10} /> View
                        </button>
                      )}
                      {report.status === 'ready' && (
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] text-slate-400 hover:text-green-400 transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Download size={10} /> PDF
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerate(report.id)}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] transition-all duration-200"
                        style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', color: '#00f5ff' }}
                      >
                        {isGenerating
                          ? <><RefreshCw size={10} className="animate-spin" /> Generating…</>
                          : <><RefreshCw size={10} /> Regenerate</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'scheduled' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <h2 className="font-bold text-slate-200 text-sm">Automated Report Dispatch Schedule</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] text-cyan-400"
              style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)' }}>
              <Plus size={11} /> Add Schedule
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {SCHEDULED.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}>
                    <Calendar size={15} style={{ color: '#00f5ff' }} />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-bold text-slate-200">{s.name}</p>
                    <p className="font-mono text-[9px] text-slate-500 mt-0.5">Next run: {s.next}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-mono text-[10px] text-slate-400">{s.frequency}</p>
                    <p className="font-mono text-[9px] text-slate-600">{s.recipients} recipients</p>
                  </div>
                  <button className="p-2 rounded-lg text-slate-600 hover:text-slate-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cyber-border-subtle)' }}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
