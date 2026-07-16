/* ThreatHuntingPage.jsx — Proactive threat hunting with KQL query builder */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Save, History, ChevronRight, Target, Zap,
  Clock, Filter, Download, AlertTriangle, Globe, Cpu, Database,
  RefreshCw, Plus, X, Eye, CheckCircle, Circle, Hash,
} from 'lucide-react';

/* ─── Mock data ───────────────────────────────────────────────────── */
const HUNT_TEMPLATES = [
  {
    id: 'h1', name: 'Lateral Movement via PsExec',
    description: 'Detect PsExec usage for lateral movement across hosts',
    severity: 'high', category: 'Lateral Movement', mitre: 'T1021',
    query: `index=windows EventCode=7045 ImagePath="*\\\\PSEXESVC.exe"\n| stats count by host, user, dest\n| where count > 3`,
  },
  {
    id: 'h2', name: 'Living-off-the-Land Binaries',
    description: 'Find unusual spawning of LOLBins (certutil, mshta, etc.)',
    severity: 'high', category: 'Defense Evasion', mitre: 'T1218',
    query: `index=windows EventCode=4688\n| where process_name IN ("certutil.exe","mshta.exe","regsvr32.exe","wscript.exe")\n| stats count by host, parent_process, user\n| where count > 1`,
  },
  {
    id: 'h3', name: 'Suspicious DNS Queries (C2 Beaconing)',
    description: 'Detect high-frequency DNS queries indicating C2 beaconing',
    severity: 'critical', category: 'C2', mitre: 'T1071',
    query: `index=dns\n| stats count by src_ip, query\n| where count > 100\n| eval entropy=length(query)\n| where entropy > 40`,
  },
  {
    id: 'h4', name: 'Credential Dumping via LSASS',
    description: 'Detect unauthorized access to lsass.exe memory',
    severity: 'critical', category: 'Credential Access', mitre: 'T1003',
    query: `index=sysmon EventCode=10 TargetImage="*\\\\lsass.exe"\n| where NOT GrantedAccess IN ("0x1000","0x1410")\n| stats count by SourceImage, host, user`,
  },
  {
    id: 'h5', name: 'Kerberoasting Attack',
    description: 'Detect Kerberos TGS requests with RC4 encryption (Kerberoasting)',
    severity: 'high', category: 'Credential Access', mitre: 'T1558',
    query: `index=windows EventCode=4769 TicketEncryptionType=0x17\n| where ServiceName != "krbtgt"\n| stats count by user, ServiceName, ClientAddress\n| where count > 5`,
  },
  {
    id: 'h6', name: 'Data Exfiltration via HTTPS',
    description: 'Identify abnormal outbound data volumes over encrypted channels',
    severity: 'medium', category: 'Exfiltration', mitre: 'T1041',
    query: `index=firewall dest_port=443 action=allowed\n| stats sum(bytes_out) as total_bytes by src_ip, dest_ip\n| where total_bytes > 52428800\n| eval size_mb=round(total_bytes/1048576, 2)`,
  },
];

const RECENT_HUNTS = [
  { id: 'RH-001', name: 'PsExec Lateral Movement Hunt', status: 'completed', results: 3, time: '2h ago', severity: 'high' },
  { id: 'RH-002', name: 'DNS Beaconing Investigation', status: 'running', results: null, time: '14m ago', severity: 'critical' },
  { id: 'RH-003', name: 'LOLBin Detection Sweep', status: 'completed', results: 11, time: '6h ago', severity: 'high' },
  { id: 'RH-004', name: 'Kerberoasting Detection', status: 'completed', results: 0, time: '1d ago', severity: 'high' },
];

const MOCK_RESULTS = [
  { host: 'WKSTN-042', user: 'DOMAIN\\svc-deploy', process: 'PSEXESVC.exe', parent: 'psexec.exe', time: '22:34:11', count: 7, risk: 'critical' },
  { host: 'DC-01', user: 'DOMAIN\\admin', process: 'PSEXESVC.exe', parent: 'psexec.exe', time: '22:15:44', count: 4, risk: 'high' },
  { host: 'WEB-SRV-03', user: 'DOMAIN\\svc-web', process: 'certutil.exe', parent: 'cmd.exe', time: '21:58:02', count: 2, risk: 'high' },
];

const SEV_STYLE = {
  critical: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  high:     { text: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  medium:   { text: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)' },
  low:      { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
};

/* ─── Sparkline ──────────────────────────────────────────────────── */
function MiniSparkline({ color = '#00f5ff' }) {
  const data = Array.from({ length: 12 }, () => Math.random() * 100);
  const max = Math.max(...data);
  const W = 80, H = 24;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - (v / max) * H }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-6" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function ThreatHuntingPage() {
  const [activeTemplate, setActiveTemplate] = useState(HUNT_TEMPLATES[0]);
  const [query, setQuery] = useState(HUNT_TEMPLATES[0].query);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [filterSev, setFilterSev] = useState('all');

  const handleRunQuery = () => {
    setRunning(true);
    setResults(null);
    setTimeout(() => {
      setRunning(false);
      setResults(MOCK_RESULTS);
    }, 2000);
  };

  const handleTemplateClick = (tmpl) => {
    setActiveTemplate(tmpl);
    setQuery(tmpl.query);
    setResults(null);
  };

  const filtered = HUNT_TEMPLATES.filter(t => filterSev === 'all' || t.severity === filterSev);

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} style={{ color: '#00f5ff' }} />
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Proactive Defense</span>
          </div>
          <h1 className="text-xl font-bold text-white">Threat Hunting</h1>
          <p className="font-mono text-[10px] text-slate-500 mt-0.5">
            Execute custom hunts against SIEM telemetry — 3.2TB indexed data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <History size={12} /> Hunt History
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)' }}>
            <Plus size={12} /> New Hunt
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Hunts', value: '2', color: '#00f5ff', spark: '#00f5ff' },
          { label: 'Completed Today', value: '14', color: '#22c55e', spark: '#22c55e' },
          { label: 'IOCs Discovered', value: '38', color: '#f97316', spark: '#f97316' },
          { label: 'Data Searched', value: '847 GB', color: '#a855f7', spark: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
            <div>
              <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="font-mono text-[9px] text-slate-500">{s.label}</p>
            </div>
            <MiniSparkline color={s.spark} />
          </div>
        ))}
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Templates/History */}
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cyber-border-subtle)' }}>
            {[
              { id: 'templates', label: 'Templates' },
              { id: 'recent', label: 'Recent' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-200"
                style={{
                  color: activeTab === tab.id ? '#00f5ff' : '#64748b',
                  background: activeTab === tab.id ? 'rgba(0,245,255,0.08)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '1px solid rgba(0,245,255,0.4)' : '1px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Severity filter */}
          {activeTab === 'templates' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all', 'critical', 'high', 'medium'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSev(sev)}
                  className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize transition-all duration-200"
                  style={{
                    background: filterSev === sev ? (sev === 'all' ? 'rgba(0,245,255,0.15)' : SEV_STYLE[sev]?.bg || 'rgba(0,245,255,0.15)') : 'rgba(255,255,255,0.03)',
                    color: filterSev === sev ? (sev === 'all' ? '#00f5ff' : SEV_STYLE[sev]?.text || '#00f5ff') : '#64748b',
                    border: `1px solid ${filterSev === sev ? (sev === 'all' ? 'rgba(0,245,255,0.3)' : SEV_STYLE[sev]?.border || 'rgba(0,245,255,0.3)') : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          )}

          {/* Template list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {activeTab === 'templates' && filtered.map(tmpl => {
              const s = SEV_STYLE[tmpl.severity];
              const isActive = activeTemplate?.id === tmpl.id;
              return (
                <motion.div
                  key={tmpl.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleTemplateClick(tmpl)}
                  className="rounded-xl p-3.5 cursor-pointer transition-all duration-200"
                  style={{
                    background: isActive ? 'rgba(0,245,255,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(0,245,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-200 leading-snug flex-1 pr-2">{tmpl.name}</span>
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      {tmpl.severity}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 mb-2 leading-relaxed">{tmpl.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(77,159,255,0.1)', color: '#4d9fff', border: '1px solid rgba(77,159,255,0.2)' }}>
                      {tmpl.mitre}
                    </span>
                    <span className="font-mono text-[8px] text-slate-600">{tmpl.category}</span>
                  </div>
                </motion.div>
              );
            })}

            {activeTab === 'recent' && RECENT_HUNTS.map(hunt => {
              const s = SEV_STYLE[hunt.severity];
              return (
                <div key={hunt.id} className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cyber-border-subtle)' }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-200 flex-1 pr-2">{hunt.name}</span>
                    {hunt.status === 'running'
                      ? <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="font-mono text-[9px] text-green-400">Running</span></div>
                      : <span className="font-mono text-[9px] text-slate-500">{hunt.results !== null ? `${hunt.results} hits` : '—'}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={9} className="text-slate-600" />
                    <span className="font-mono text-[9px] text-slate-600">{hunt.time}</span>
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded capitalize"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      {hunt.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 cols: Query Editor + Results */}
        <div className="lg:col-span-2 space-y-4">

          {/* Query Editor */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center gap-2">
                <Hash size={13} style={{ color: '#00f5ff' }} />
                <span className="font-mono text-[10px] text-slate-300 font-bold">
                  {activeTemplate?.name || 'KQL Query Editor'}
                </span>
                {activeTemplate && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(77,159,255,0.1)', color: '#4d9fff', border: '1px solid rgba(77,159,255,0.2)' }}>
                    {activeTemplate.mitre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[9px] text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Save size={10} /> Save
                </button>
                <button
                  onClick={handleRunQuery}
                  disabled={running}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all duration-200"
                  style={{ background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.35)', color: '#00f5ff' }}
                >
                  {running
                    ? <><RefreshCw size={11} className="animate-spin" /> Running…</>
                    : <><Play size={11} /> Run Hunt</>}
                </button>
              </div>
            </div>

            {/* Code editor area */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col pt-3 pb-3 select-none"
                style={{ background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                {query.split('\n').map((_, i) => (
                  <span key={i} className="font-mono text-[9px] text-slate-700 text-right pr-2.5 leading-6">
                    {i + 1}
                  </span>
                ))}
              </div>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 font-mono text-[11px] text-slate-200 bg-transparent outline-none resize-none leading-6"
                rows={Math.max(6, query.split('\n').length + 1)}
                spellCheck={false}
                style={{ tabSize: 2 }}
              />
            </div>

            {/* Runtime info */}
            <div className="px-4 py-2 border-t flex items-center gap-4"
              style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}>
              <span className="font-mono text-[9px] text-slate-600">Time range: <span className="text-slate-400">Last 24h</span></span>
              <span className="font-mono text-[9px] text-slate-600">Index: <span className="text-slate-400">windows, sysmon, dns, firewall</span></span>
              {results && <span className="font-mono text-[9px] text-green-400">✓ {results.length} results in 1.24s</span>}
            </div>
          </div>

          {/* Results */}
          <AnimatePresence>
            {(results || running) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-[10px] font-bold text-slate-300">
                    Hunt Results {results && `(${results.length} matches)`}
                  </span>
                  {results && (
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[9px] text-slate-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Download size={10} /> Export
                    </button>
                  )}
                </div>

                {running ? (
                  <div className="flex items-center justify-center py-10 gap-3">
                    <RefreshCw size={16} className="text-cyan-400 animate-spin" />
                    <span className="font-mono text-[11px] text-slate-400">Hunting across 3.2TB of telemetry…</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {['Host', 'User', 'Process', 'Parent', 'Time', 'Count', 'Risk'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-mono text-[9px] uppercase tracking-widest text-slate-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results?.map((row, i) => {
                          const rc = SEV_STYLE[row.risk];
                          return (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <td className="px-4 py-2.5 font-mono text-[10px] text-cyan-400">{row.host}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{row.user}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-orange-400">{row.process}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{row.parent}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{row.time}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] font-bold text-white">{row.count}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded capitalize"
                                  style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                                  {row.risk}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!results && !running && (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}>
                <Search size={22} style={{ color: '#00f5ff' }} />
              </div>
              <p className="font-mono text-sm text-slate-400 font-bold mb-1">Ready to Hunt</p>
              <p className="font-mono text-[10px] text-slate-600">Select a template or write a custom query, then click Run Hunt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
