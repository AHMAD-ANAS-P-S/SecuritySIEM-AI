/* AlertDetailPage.jsx — Deep-dive single alert investigation view */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShieldAlert, Clock, Globe, Server, Code2,
  Tag, FileText, CheckCircle, Copy, Brain, ChevronRight,
  AlertTriangle, Lock, Activity, Terminal, Shield,
  ExternalLink, Play, Bookmark, RefreshCw,
} from 'lucide-react';

/* ─── Mock Alert Data ────────────────────────────────────────────── */
const MOCK_ALERT = {
  id: 'INC-9814',
  title: 'Ransomware Execution Detected',
  severity: 'critical',
  status: 'open',
  timestamp: '2026-07-15 22:47:03 UTC',
  source: '185.220.101.52',
  dest: 'WKSTN-042',
  assignee: 'Analyst-42',
  ruleId: 'RULE-7741',
  confidence: 97,
  category: 'Malware',
  mitre: [
    { id: 'T1486', label: 'Data Encrypted for Impact',              tactic: 'Impact' },
    { id: 'T1059', label: 'Command and Scripting Interpreter',       tactic: 'Execution' },
    { id: 'T1071', label: 'Application Layer Protocol',              tactic: 'C2' },
    { id: 'T1027', label: 'Obfuscated Files or Information',         tactic: 'Defense Evasion' },
  ],
  iocs: [
    { type: 'IP',     value: '185.220.101.52',                      threat: 'Known C2 Server',    confidence: 98 },
    { type: 'Hash',   value: 'a3f4b1c9e2d87f3...7a2b',             threat: 'WannaCry.v3',         confidence: 97 },
    { type: 'Domain', value: 'malware-c2.onion.to',                  threat: 'C2 Infrastructure',  confidence: 89 },
    { type: 'File',   value: 'C:\\Users\\Temp\\svchost32.exe',      threat: 'Dropper Payload',     confidence: 95 },
  ],
  timeline: [
    { time: '22:41:02', event: 'Suspicious process spawned: svchost32.exe (parent: explorer.exe)', type: 'process', severity: 'high' },
    { time: '22:42:15', event: 'Outbound TLS connection to known C2: 185.220.101.52:443',         type: 'network', severity: 'critical' },
    { time: '22:43:30', event: 'File encryption activity detected — 243 files encrypted in /Users', type: 'file',    severity: 'critical' },
    { time: '22:44:18', event: 'Lateral movement attempt via SMB share (BLOCKED by firewall)',      type: 'lateral', severity: 'high' },
    { time: '22:47:03', event: 'SIEM rule triggered: Ransomware.Execution.v2 — Analyst notified',  type: 'alert',   severity: 'info' },
  ],
  rawLogs: [
    '2026-07-15T22:41:02Z [ENDPOINT] WKSTN-042 proc=svchost32.exe pid=4412 parent=explorer.exe sha256=a3f4b1...',
    '2026-07-15T22:42:15Z [NETWORK] src=192.168.1.42 dst=185.220.101.52:443 proto=TLS bytes=14320 dir=outbound',
    '2026-07-15T22:43:30Z [FILE] WKSTN-042 op=ENCRYPT path=C:\\Users\\Documents\\*.* count=243 ext=.locked',
    '2026-07-15T22:44:18Z [NETWORK] smb_lateral src=WKSTN-042 dst=DC-01 share=ADMIN$ status=BLOCKED',
    '2026-07-15T22:47:03Z [SIEM] alert_id=INC-9814 severity=critical rule=Ransomware.Execution.v2 conf=0.97',
  ],
};

/* ─── Style Maps ─────────────────────────────────────────────────── */
const SEV_STYLES = {
  critical: { bg: 'var(--threat-critical-glow)',  text: 'var(--threat-critical)', border: 'var(--threat-critical-border)' },
  high:     { bg: 'var(--threat-high-glow)',      text: 'var(--threat-high)',     border: 'var(--threat-high-border)' },
  medium:   { bg: 'var(--threat-medium-glow)',    text: 'var(--threat-medium)',   border: 'var(--threat-medium-border)' },
  low:      { bg: 'var(--threat-low-glow)',       text: 'var(--threat-low)',      border: 'var(--threat-low-border)' },
  info:     { bg: 'var(--threat-info-glow)',      text: 'var(--threat-info)',     border: 'var(--threat-info-border)' },
};

const TIMELINE_TYPE_COLORS = {
  process: 'var(--cyber-accent-blue)',
  network: 'var(--threat-critical)',
  file:    'var(--threat-high)',
  lateral: 'var(--threat-medium)',
  alert:   'var(--cyber-accent-cyan)',
};

const TACTIC_COLORS = {
  'Impact':          'var(--threat-critical)',
  'Execution':       'var(--threat-high)',
  'C2':              'var(--cyber-accent-violet)',
  'Defense Evasion': 'var(--threat-medium)',
};

/* ─── Sub-components ─────────────────────────────────────────────── */
function PanelSection({ title, icon: Icon, children, badge }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: 'var(--cyber-border-muted)', background: 'var(--cyber-bg-accent)' }}>
        <h2 className="font-headings text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--cyber-text-bright)' }}>
          <Icon size={14} style={{ color: 'var(--cyber-accent-cyan)' }} />
          {title}
        </h2>
        {badge && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--cyber-accent-cyan-glow)', color: 'var(--cyber-accent-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function AlertDetailPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(MOCK_ALERT.status);
  const [note, setNote] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [bookmarked, setBookmarked] = useState(false);
  const [runningPlaybook, setRunningPlaybook] = useState(false);

  const alert = MOCK_ALERT;
  const sev = SEV_STYLES[alert.severity] || SEV_STYLES.high;

  const copyToClipboard = (val, key) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleRunPlaybook = () => {
    setRunningPlaybook(true);
    setTimeout(() => setRunningPlaybook(false), 3000);
  };

  return (
    <div className="p-4 lg:p-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>
      {/* Back navigation */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/alerts')}
        className="flex items-center gap-1.5 font-mono text-[10px] mb-5 transition-colors"
        style={{ color: 'var(--cyber-text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
      >
        <ArrowLeft size={12} />
        Back to Security Alerts Feed
      </motion.button>

      {/* ── Alert Banner Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl p-6 mb-5 relative overflow-hidden"
        style={{ background: sev.bg, border: `1px solid ${sev.border}`, boxShadow: `0 0 40px ${sev.bg}` }}
      >
        {/* Background glow orb */}
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: sev.text }} />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative">
          {/* Left: Title + Meta */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${sev.border}`, boxShadow: `0 0 16px ${sev.bg}` }}>
              <ShieldAlert size={22} style={{ color: sev.text }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: sev.text }}>
                  {alert.severity} severity
                </span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>·</span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>{alert.id}</span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>·</span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>{alert.ruleId}</span>
              </div>
              <h1 className="font-headings text-xl font-bold mb-2" style={{ color: 'var(--cyber-text-bright)' }}>
                {alert.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { icon: Clock, val: alert.timestamp },
                  { icon: Globe, val: alert.source },
                  { icon: Server, val: alert.dest },
                ].map(({ icon: Icon, val }) => (
                  <span key={val} className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--cyber-text-base)' }}>
                    <Icon size={11} style={{ color: 'var(--cyber-text-muted)' }} />
                    {val}
                  </span>
                ))}
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--cyber-text-muted)', border: `1px solid ${sev.border}` }}>
                  Confidence: {alert.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap lg:flex-nowrap">
            {/* Status dropdown */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="rounded-lg px-3 py-2 font-mono text-[10px] transition-all"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${sev.border}`,
                color: 'var(--cyber-text-bright)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="open">🔴 Open</option>
              <option value="investigating">🟡 Investigating</option>
              <option value="closed">🟢 Closed</option>
            </select>
            <button
              onClick={() => setBookmarked(b => !b)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all"
              style={{
                background: bookmarked ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${bookmarked ? 'rgba(251,191,36,0.4)' : sev.border}`,
                color: bookmarked ? '#fbbf24' : 'var(--cyber-text-muted)',
              }}
            >
              <Bookmark size={14} />
            </button>
            <button
              onClick={() => navigate('/ai-investigation')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all"
              style={{ background: 'var(--cyber-accent-cyan-glow)', border: '1px solid rgba(0,229,255,0.3)', color: 'var(--cyber-accent-cyan)' }}
            >
              <Brain size={12} />
              AI Investigate
            </button>
            <button
              onClick={handleRunPlaybook}
              disabled={runningPlaybook}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all"
              style={{
                background: runningPlaybook ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.4)',
                border: `1px solid ${runningPlaybook ? 'rgba(16,185,129,0.3)' : sev.border}`,
                color: runningPlaybook ? 'var(--cyber-accent-green)' : 'var(--cyber-text-base)',
              }}
            >
              {runningPlaybook ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
              {runningPlaybook ? 'Running...' : 'Run Playbook'}
            </button>
          </div>
        </div>

        {/* MITRE ATT&CK Tags */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t" style={{ borderColor: `${sev.border}` }}>
          {alert.mitre.map(t => (
            <span key={t.id}
              className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-lg transition-all cursor-default"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${TACTIC_COLORS[t.tactic] ? `${TACTIC_COLORS[t.tactic]}44` : 'rgba(255,255,255,0.1)'}`,
                color: TACTIC_COLORS[t.tactic] || 'var(--cyber-text-muted)',
              }}
            >
              <Tag size={9} />
              <span style={{ color: 'var(--cyber-text-muted)' }}>{t.tactic}:</span> {t.id}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
            {[
              { id: 'timeline', label: 'Attack Timeline', icon: Activity },
              { id: 'logs',     label: 'Raw Logs',        icon: Terminal },
              { id: 'mitre',    label: 'MITRE ATT&CK',   icon: Shield },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg font-mono text-[10px] font-medium transition-all duration-200"
                  style={{
                    background: isActive ? 'var(--cyber-accent-cyan-glow)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(0,229,255,0.25)' : 'transparent'}`,
                    color: isActive ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-muted)',
                  }}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <PanelSection title="Attack Timeline Reconstruction" icon={Activity} badge={`${alert.timeline.length} events`}>
                  <div className="space-y-0">
                    {alert.timeline.map((ev, i) => {
                      const dotColor = TIMELINE_TYPE_COLORS[ev.type] || 'var(--cyber-text-muted)';
                      return (
                        <motion.div
                          key={ev.time}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.3 }}
                          className="flex gap-4"
                        >
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                              style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}80` }} />
                            {i < alert.timeline.length - 1 && (
                              <div className="w-px flex-1 my-1.5" style={{ background: 'var(--cyber-border-muted)', minHeight: '28px' }} />
                            )}
                          </div>
                          <div className="pb-5 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: dotColor }}>{ev.time}</span>
                              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wide"
                                style={{ background: `${dotColor}22`, color: dotColor, border: `1px solid ${dotColor}44` }}>
                                {ev.type}
                              </span>
                            </div>
                            <p className="font-mono text-[11px]" style={{ color: 'var(--cyber-text-base)' }}>{ev.event}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </PanelSection>
              )}

              {/* Raw Logs Tab */}
              {activeTab === 'logs' && (
                <PanelSection title="Raw Log Events" icon={Code2} badge={`${alert.rawLogs.length} events`}>
                  <div className="rounded-lg overflow-hidden" style={{ background: 'var(--cyber-bg-deep)', border: '1px solid var(--cyber-border-muted)' }}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--cyber-border-muted)' }}>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="font-mono text-[9px] ml-2" style={{ color: 'var(--cyber-text-muted)' }}>log-stream :: INC-9814</span>
                    </div>
                    <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                      {alert.rawLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 group rounded p-1.5 transition-colors"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--cyber-bg-accent)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span className="font-mono text-[9px] w-5 text-right flex-shrink-0 mt-0.5 select-none"
                            style={{ color: 'var(--cyber-text-dim)' }}>{i + 1}</span>
                          <pre className="font-mono text-[9px] flex-1 whitespace-pre-wrap break-all leading-relaxed"
                            style={{ color: 'var(--cyber-text-base)' }}>{log}</pre>
                          <button
                            onClick={() => copyToClipboard(log, i)}
                            className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all"
                            style={{ color: copied === i ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-dim)' }}
                          >
                            {copied === i ? <CheckCircle size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </PanelSection>
              )}

              {/* MITRE ATT&CK Tab */}
              {activeTab === 'mitre' && (
                <PanelSection title="MITRE ATT&CK Technique Mapping" icon={Shield} badge={`${alert.mitre.length} techniques`}>
                  <div className="space-y-3">
                    {alert.mitre.map((t, i) => {
                      const color = TACTIC_COLORS[t.tactic] || 'var(--cyber-text-muted)';
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center justify-between rounded-lg px-4 py-3 group cursor-pointer transition-all duration-200"
                          style={{ background: 'var(--cyber-bg-accent)', border: `1px solid ${color}33` }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = `${color}77`}
                          onMouseLeave={e => e.currentTarget.style.borderColor = `${color}33`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color, opacity: 0.7 }} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold" style={{ color }}>{t.id}</span>
                                <span className="font-mono text-[8px] px-2 py-0.5 rounded"
                                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                                  {t.tactic}
                                </span>
                              </div>
                              <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--cyber-text-base)' }}>{t.label}</p>
                            </div>
                          </div>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--cyber-text-muted)' }} />
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="font-mono text-[9px] mt-4 text-center" style={{ color: 'var(--cyber-text-dim)' }}>
                    Based on MITRE ATT&CK® Framework v14 · enterprise-attack
                  </p>
                </PanelSection>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* IOC Panel */}
          <PanelSection title="Indicators of Compromise" icon={AlertTriangle} badge={`${alert.iocs.length} IOCs`}>
            <div className="space-y-2.5">
              {alert.iocs.map((ioc, i) => (
                <motion.div
                  key={ioc.value}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-lg p-3 transition-all duration-200 group"
                  style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyber-border-glow)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cyber-border-muted)'}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[8px] px-2 py-0.5 rounded"
                      style={{ background: 'var(--cyber-accent-blue-glow)', color: 'var(--cyber-accent-blue)', border: '1px solid rgba(56,189,248,0.2)' }}>
                      {ioc.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="text-right">
                        <span className="font-mono text-[9px] font-bold" style={{ color: ioc.confidence >= 90 ? 'var(--threat-critical)' : 'var(--threat-medium)' }}>
                          {ioc.confidence}%
                        </span>
                        <div className="w-12 h-1 rounded-full mt-0.5" style={{ background: 'var(--cyber-border-subtle)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${ioc.confidence}%`, background: ioc.confidence >= 90 ? 'var(--threat-critical)' : 'var(--threat-medium)' }} />
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(ioc.value, `ioc-${i}`)}
                        className="opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: copied === `ioc-${i}` ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-muted)' }}>
                        {copied === `ioc-${i}` ? <CheckCircle size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-[9px] break-all mb-1" style={{ color: 'var(--cyber-text-bright)' }}>{ioc.value}</p>
                  <p className="font-mono text-[8px]" style={{ color: 'var(--cyber-text-muted)' }}>{ioc.threat}</p>
                </motion.div>
              ))}
            </div>
          </PanelSection>

          {/* Analyst Notes */}
          <PanelSection title="Investigation Notes" icon={FileText}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Document your investigation findings, containment steps, and evidence chain..."
              rows={5}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              className="w-full rounded-lg px-3 py-2.5 font-mono text-[10px] resize-none transition-all duration-200"
              style={{
                background: 'var(--cyber-bg-input)',
                border: `1px solid ${noteFocused ? 'var(--cyber-border-glow)' : 'var(--cyber-border-subtle)'}`,
                color: 'var(--cyber-text-bright)',
                outline: 'none',
                boxShadow: noteFocused ? '0 0 0 3px var(--cyber-accent-cyan-glow)' : 'none',
              }}
            />
            <button
              className="mt-2 w-full rounded-lg py-2 font-mono text-[10px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: 'var(--cyber-accent-cyan-glow)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyber-accent-cyan)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 12px var(--cyber-accent-cyan-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cyber-accent-cyan-glow)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Lock size={10} />
              Commit to Audit Log
            </button>
          </PanelSection>

          {/* Quick Actions */}
          <div className="rounded-xl p-4"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: 'var(--cyber-text-muted)' }}>
              Containment Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Isolate Endpoint (WKSTN-042)', color: 'var(--threat-critical)', hoverBg: 'rgba(255,45,85,0.1)' },
                { label: 'Block Source IP Globally', color: 'var(--threat-high)', hoverBg: 'rgba(255,107,53,0.1)' },
                { label: 'Trigger SOAR Playbook', color: 'var(--cyber-accent-cyan)', hoverBg: 'var(--cyber-accent-cyan-glow)' },
              ].map(action => (
                <button key={action.label}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-[10px] text-left transition-all duration-200"
                  style={{ background: 'var(--cyber-bg-accent)', border: `1px solid var(--cyber-border-muted)`, color: action.color }}
                  onMouseEnter={e => { e.currentTarget.style.background = action.hoverBg; e.currentTarget.style.borderColor = `${action.color}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--cyber-bg-accent)'; e.currentTarget.style.borderColor = 'var(--cyber-border-muted)'; }}
                >
                  {action.label}
                  <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
