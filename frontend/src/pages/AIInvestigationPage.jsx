/* AIInvestigationPage.jsx — AI-powered threat investigation with chat interface */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, AlertTriangle, Shield, Target, ChevronRight,
  Copy, RefreshCw, ThumbsUp, ThumbsDown, Cpu, Globe, Clock, Hash,
  Terminal, Zap, FileSearch, Activity, Lock, Unlock, Database,
} from 'lucide-react';

/* ─── Mock data ───────────────────────────────────────────────────── */
const SUGGESTED_QUERIES = [
  { id: 'q1', text: 'Investigate ALT-9814 ransomware execution', icon: AlertTriangle, color: '#ef4444' },
  { id: 'q2', text: 'Analyze lateral movement from 10.0.14.22', icon: Target, color: '#f97316' },
  { id: 'q3', text: 'Explain Log4Shell exploitation patterns', icon: Globe, color: '#4d9fff' },
  { id: 'q4', text: 'Summarize today\'s critical threats', icon: Shield, color: '#a855f7' },
  { id: 'q5', text: 'Map attack chain for WKSTN-042 compromise', icon: Activity, color: '#22c55e' },
  { id: 'q6', text: 'Generate SOAR playbook for brute force', icon: Terminal, color: '#00f5ff' },
];

const ENTITY_PANEL = [
  { type: 'IP', value: '185.220.101.52', risk: 'critical', label: 'Source IP', detail: 'Tor Exit Node — RU' },
  { type: 'HOST', value: 'WKSTN-042', risk: 'critical', label: 'Endpoint', detail: 'Ransomware active' },
  { type: 'FILE', value: 'svchost_fake.exe', risk: 'high', label: 'Artifact', detail: 'MD5: a1b2c3d4…' },
  { type: 'CVE', value: 'CVE-2021-44228', risk: 'high', label: 'Vulnerability', detail: 'Log4Shell RCE' },
  { type: 'USER', value: 'WKSTN-042\\Admin', risk: 'medium', label: 'Account', detail: 'Privilege escalated' },
  { type: 'DOMAIN', value: 'evil-c2.xyz', risk: 'critical', label: 'C2 Domain', detail: 'Active beacon' },
];

const MITRE_TACTICS = [
  { id: 'TA0001', name: 'Initial Access', techniques: ['T1190', 'T1078'], active: true },
  { id: 'TA0002', name: 'Execution', techniques: ['T1059.001', 'T1204'], active: true },
  { id: 'TA0003', name: 'Persistence', techniques: ['T1547'], active: false },
  { id: 'TA0004', name: 'Privilege Esc', techniques: ['T1068'], active: true },
  { id: 'TA0005', name: 'Defense Evasion', techniques: ['T1036', 'T1027'], active: true },
  { id: 'TA0006', name: 'Credential Access', techniques: ['T1003'], active: false },
  { id: 'TA0007', name: 'Discovery', techniques: ['T1082'], active: false },
  { id: 'TA0008', name: 'Lateral Movement', techniques: ['T1021.001'], active: true },
  { id: 'TA0010', name: 'Exfiltration', techniques: ['T1041'], active: false },
  { id: 'TA0040', name: 'Impact', techniques: ['T1486'], active: true },
];

const INITIAL_MESSAGES = [
  {
    id: 'sys-1',
    role: 'assistant',
    timestamp: '22:47:03',
    content: `**SIEM AI Investigation Engine** is online.\n\nI have full context of your SIEM telemetry for the last 24 hours — **1,847 events**, **7 critical incidents**, and **3,412 monitored endpoints**.\n\nI can help you:\n- Investigate specific alerts or attack chains\n- Correlate events across logs, endpoints, and network data\n- Map techniques to MITRE ATT&CK framework\n- Generate SOAR playbooks and response recommendations\n- Explain IOCs and threat actor TTPs\n\nWhat would you like to investigate?`,
    sources: [],
    confidence: null,
  },
];

const AI_RESPONSES = {
  default: (q) => ({
    content: `**Analyzing:** "${q}"\n\n**Threat Intelligence Summary:**\n\nBased on correlated log data from EDR, SIEM, and network telemetry, I've identified the following attack chain:\n\n1. **Initial Access** — Exploit via CVE-2021-44228 (Log4Shell) against WEB-SRV-03 at 21:14:07\n2. **Execution** — PowerShell cradle launched \`svchost_fake.exe\` from temp directory\n3. **Privilege Escalation** — Token impersonation using \`SeImpersonatePrivilege\`\n4. **Lateral Movement** — PsExec beacon to WKSTN-042 via compromised credentials\n5. **Impact** — Ransomware encryption initiated at 22:47:03\n\n**Risk Score: 9.8 / 10** — Immediate containment recommended.\n\n**Recommended Actions:**\n- Isolate WKSTN-042 immediately (SOAR playbook: HOST-ISOLATE-P1)\n- Block C2 domain \`evil-c2.xyz\` at perimeter firewall\n- Reset credentials for WKSTN-042\\Admin and DC-01\\svc-deploy\n- Collect forensic snapshot before remediation`,
    sources: ['EDR Telemetry', 'Firewall Logs', 'AD Event Log', 'Threat Intel Feed'],
    confidence: 94,
  }),
};

/* ─── Risk color map ─────────────────────────────────────────────── */
const RISK_COLORS = {
  critical: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  high:     { text: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  medium:   { text: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)' },
  low:      { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
};

/* ─── Sub-components ─────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.3)' }}>
        <Brain size={12} style={{ color: '#00f5ff' }} />
      </div>
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.1)' }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ msg, isNew }) {
  const isUser = msg.role === 'user';

  // Simple markdown-lite renderer
  const renderContent = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-white font-mono text-[11px] mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="font-mono text-[11px] text-slate-300 ml-3 mb-0.5 list-disc">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
      }
      if (/^\d+\./.test(line)) {
        const content = line.replace(/\*\*(.*?)\*\*/g, (_, g) => g);
        return <li key={i} className="font-mono text-[11px] text-slate-300 ml-3 mb-1 list-decimal">{content}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      // Bold inline
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="font-mono text-[11px] text-slate-300 mb-0.5">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
        </p>
      );
    });
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.3)' }}>
          <Brain size={12} style={{ color: '#00f5ff' }} />
        </div>
      )}

      <div className={`max-w-[82%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className="px-4 py-3 rounded-xl"
          style={isUser
            ? { background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.2)' }
            : { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cyber-border-subtle)' }}
        >
          {isUser
            ? <p className="font-mono text-[11px] text-cyan-300">{msg.content}</p>
            : <div className="space-y-0.5">{renderContent(msg.content)}</div>
          }
        </div>

        {/* Sources + confidence */}
        {!isUser && msg.sources?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {msg.sources.map((src, i) => (
              <span key={i} className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(77,159,255,0.1)', color: '#4d9fff', border: '1px solid rgba(77,159,255,0.2)' }}>
                {src}
              </span>
            ))}
            {msg.confidence && (
              <span className="font-mono text-[9px] text-slate-500">
                Confidence: <span className="text-green-400 font-bold">{msg.confidence}%</span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-slate-600">{msg.timestamp}</span>
            <button className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors">
              <Copy size={10} />
            </button>
            <button className="p-1 rounded text-slate-600 hover:text-green-400 transition-colors">
              <ThumbsUp size={10} />
            </button>
            <button className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
              <ThumbsDown size={10} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EntityCard({ entity }) {
  const c = RISK_COLORS[entity.risk];
  const ICON_MAP = { IP: Globe, HOST: Cpu, FILE: FileSearch, CVE: AlertTriangle, USER: Lock, DOMAIN: Database };
  const Icon = ICON_MAP[entity.type] || Shield;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${c.border}` }}>
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: c.bg }}>
        <Icon size={13} style={{ color: c.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] font-bold text-slate-200 truncate">{entity.value}</p>
        <p className="font-mono text-[9px] text-slate-500">{entity.detail}</p>
      </div>
      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded capitalize flex-shrink-0"
        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
        {entity.risk}
      </span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function AIInvestigationPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('entities');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      content: query,
      sources: [],
      confidence: null,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const resp = AI_RESPONSES.default(query);
      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        content: resp.content,
        sources: resp.sources,
        confidence: resp.confidence,
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 1800 + Math.random() * 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* ── Left: Chat Interface ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.3)' }}>
              <Brain size={18} style={{ color: '#00f5ff' }} />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">AI Investigation Engine</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-mono text-[9px] text-slate-500">SIEM AI Engine v4.2.1 — Microsoft SecOps LLM</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={11} /> New Chat
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {messages.map((msg, i) => (
            <ChatMessage key={msg.id} msg={msg} isNew={i === messages.length - 1 && msg.role === 'assistant'} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested queries */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest mb-2 px-1">Suggested Investigations</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_QUERIES.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleSend(q.text)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cyber-border-subtle)' }}
                >
                  <q.icon size={12} style={{ color: q.color, flexShrink: 0 }} />
                  <span className="font-mono text-[10px] text-slate-300 truncate">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex items-end gap-2 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,245,255,0.15)' }}>
            <Sparkles size={14} className="text-slate-500 flex-shrink-0 mb-1" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SIEM AI to investigate threats, correlate IOCs, map MITRE techniques, or explain log events..."
              rows={1}
              className="flex-1 bg-transparent font-mono text-[11px] text-slate-200 placeholder-slate-600 resize-none outline-none min-h-[20px] max-h-[80px]"
              style={{ lineHeight: '1.6' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-30"
              style={{ background: 'rgba(0,245,255,0.2)', border: '1px solid rgba(0,245,255,0.4)' }}
            >
              <Send size={12} style={{ color: '#00f5ff' }} />
            </button>
          </div>
          <p className="font-mono text-[9px] text-slate-700 text-center mt-1.5">
            Press Enter to send · Shift+Enter for newline · SIEM AI may produce incomplete results
          </p>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col" style={{ background: 'rgba(0,0,0,0.15)' }}>

        {/* Panel tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {[
            { id: 'entities', label: 'Entities' },
            { id: 'mitre', label: 'MITRE' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors"
              style={{
                color: activeTab === tab.id ? '#00f5ff' : '#64748b',
                borderBottom: activeTab === tab.id ? '1px solid #00f5ff' : '1px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'entities' && (
            <>
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600 mb-3">Extracted IOCs & Entities</p>
              {ENTITY_PANEL.map((entity, i) => (
                <EntityCard key={i} entity={entity} />
              ))}
            </>
          )}

          {activeTab === 'mitre' && (
            <>
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600 mb-3">ATT&CK Coverage Map</p>
              <div className="space-y-2">
                {MITRE_TACTICS.map((tactic) => (
                  <div key={tactic.id} className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${tactic.active ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div className="flex items-center gap-2 px-3 py-2"
                      style={{ background: tactic.active ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)' }}>
                      {tactic.active
                        ? <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        : <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />}
                      <span className="font-mono text-[10px] font-bold" style={{ color: tactic.active ? '#ef4444' : '#64748b' }}>
                        {tactic.name}
                      </span>
                      <span className="font-mono text-[9px] text-slate-600 ml-auto">{tactic.id}</span>
                    </div>
                    {tactic.active && (
                      <div className="px-3 pb-2 pt-1 flex flex-wrap gap-1">
                        {tactic.techniques.map(t => (
                          <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stats footer */}
        <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'IOCs Found', value: '6', color: '#ef4444' },
              { label: 'Tactics', value: '6', color: '#f97316' },
              { label: 'Risk Score', value: '9.8', color: '#ef4444' },
            ].map(stat => (
              <div key={stat.label} className="text-center rounded-lg py-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="font-mono text-[8px] text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
