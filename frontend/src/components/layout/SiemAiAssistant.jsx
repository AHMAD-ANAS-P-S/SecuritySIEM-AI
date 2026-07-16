/* SiemAiAssistant.jsx — Enterprise SIEM AI Assistant Panel (Microsoft Security Copilot aesthetic) */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, ShieldAlert, Terminal, Bot,
  CheckCircle2, Loader2, AlertTriangle, ChevronRight,
  Fingerprint, Network, FileCode, ClipboardList, Crosshair,
  BookLock, ShieldCheck, BarChart2,
} from 'lucide-react';
import { useUI } from '@hooks';

/* ─── Investigation Presets ──────────────────────────────────────── */
const PRESETS = [
  { id: 'threat',    label: 'Threat Analysis',       icon: ShieldAlert,   desc: 'Correlate events and anomalous indicators across telemetry' },
  { id: 'ioc',       label: 'IOC Explanation',        icon: Fingerprint,   desc: 'Identify and analyze indicators of compromise' },
  { id: 'mitre',     label: 'MITRE ATT&CK Mapping',  icon: Network,       desc: 'Map observed behaviors to standard TTP tactics & techniques' },
  { id: 'log',       label: 'Log Explanation',        icon: Terminal,      desc: 'Translate raw event log entries into analyst language' },
  { id: 'incident',  label: 'Incident Summary',       icon: ClipboardList, desc: 'Generate executive summary of active incident scope' },
  { id: 'response',  label: 'Recommended Response',   icon: Crosshair,     desc: 'Retrieve containment and remediation playbook steps' },
  { id: 'detection', label: 'Detection Suggestions',  icon: FileCode,      desc: 'Generate KQL / Sigma detection rules for identified TTPs' },
  { id: 'risk',      label: 'Risk Explanation',       icon: BarChart2,     desc: 'Assess severity ratings, impact scope, and business risk' },
];

/* ─── SIEM AI Response Library ──────────────────────────────────── */
const MOCK_ANSWERS = {
  threat: {
    title: 'Threat Analysis — Credential Harvesting via LSASS Memory Dump',
    severity: 'critical',
    content: `**Correlated Event Chain Identified on Host: WKSTN-042**

**[T1003.001] LSASS Memory Access**
Process \`rundll32.exe\` opened handle to \`lsass.exe\` with permission mask \`0x1010\` (VM Read). Dump file \`lsass.dmp\` written to \`%TEMP%\\uploads\\\`.

**[T1053.005] Scheduled Task Persistence**
Dump initiated by a scheduled task registered under local administrator context (\`SYSTEM\`). Task name: \`WindowsDefenderCacheHandler\` — masquerading as a legitimate service.

**[T1090.003] Tor Exit Node Exfiltration**
Outbound connection to known Tor relay \`185.220.101.52:443\` occurred within 120 seconds of dump creation. Compressed archive containing credential store transmitted.

**Risk Score:** 9.4 / 10 — Immediate escalation required.`,
  },
  ioc: {
    title: 'IOC Analysis — Threat Intelligence Correlation',
    severity: 'high',
    content: `**Entity: IP Address 185.220.101.52**
• Threat Score: **98 / 100** (Highly Malicious)
• Classification: Known Tor Exit Node & SSH Brute Force Origin
• ASN: AS199624 (Private Layer Inc.) — Bulletproof Hosting
• Geo: Romania (RO)
• Associated Campaigns: APT29, MuddyWater, Lazarus Group

**Entity: File Hash (MD5) 7a641fcf8f2a3d9b01c4**
• Malware Family: \`AgentTesla.Stealer.v4\`
• Sandbox Verdict: MALICIOUS — Keylogger + Credential Harvester
• Detected by: 54/72 AV engines (VirusTotal)
• First Seen: 2026-07-10T08:14:22Z`,
  },
  mitre: {
    title: 'MITRE ATT&CK Framework Mapping',
    severity: 'critical',
    content: `**Tactic / Technique Correlation:**

| Tactic (ID) | Technique | Sub-Technique | Confidence |
|---|---|---|---|
| Credential Access (TA0006) | OS Credential Dumping (T1003) | LSASS Memory (T1003.001) | HIGH |
| Execution (TA0002) | Scheduled Task (T1053) | Scheduled Task/Job (T1053.005) | HIGH |
| Defense Evasion (TA0005) | Masquerading (T1036) | Match Legitimate Name (T1036.005) | MEDIUM |
| Command & Control (TA0011) | Proxy (T1090) | Multi-hop Proxy / Tor (T1090.003) | HIGH |
| Exfiltration (TA0010) | Exfil Over C2 Channel (T1041) | — | HIGH |

**Campaign Similarity Score:** 87% match to APT29 (Cozy Bear) TTPs.`,
  },
  log: {
    title: 'Log Analysis — Windows Security Event Decoder',
    severity: 'high',
    content: `**Parsed Event Record:**

\`\`\`
EventID: 4624 (Account Logon — Successful)
LogonType: 3 (Network Logon)
LogonID: 0x3E7 (SYSTEM context)
TargetUsername: DomainAdmin_SV
WorkstationName: WKSTN-042
NetworkAddress: 10.0.14.42
AuthPackage: NTLM
\`\`\`

**Analyst Interpretation:**
This event represents a successful network-authenticated logon using elevated domain administrator credentials originating from a workstation flagged for active ransomware infection.

**Risk:** This pattern is consistent with lateral movement via stolen credentials — the attacker is pivoting from the compromised workstation to domain-level resources.`,
  },
  incident: {
    title: 'Incident Summary — Active Host Compromise INC-9814',
    severity: 'critical',
    content: `**Classification:** Active Multi-Stage Compromise | Priority P1

**Affected Assets:**
• Primary Host: \`WKSTN-042\` (IP: 10.0.14.42)
• At-Risk Assets: \`DC-01\`, \`WEB-SRV-03\`

**Attack Chronology:**
| UTC Time | Event | Severity |
|---|---|---|
| 22:08:33 | RDP brute force from RO IP \`185.220.101.52\` | HIGH |
| 22:31:55 | SQL injection blocked on internal DB API | HIGH |
| 22:43:18 | Successful domain logon with stolen credentials | CRITICAL |
| 22:47:03 | Ransomware payload execution blocked by EDR | CRITICAL |

**Current Status:** Ransomware contained by EDR agent — lateral movement ongoing.`,
  },
  response: {
    title: 'Recommended Response Playbook — INC-9814',
    severity: 'medium',
    content: `**Phase 1 — Immediate Containment (0–15 min):**
1. **EDR Isolation:** Invoke network isolation on \`WKSTN-042\` via CrowdStrike Falcon console.
2. **Credential Revocation:** Expire \`DomainAdmin_SV\` password and revoke all active sessions (AD & Entra ID).
3. **Network Block:** Deploy firewall ACL to block all traffic to/from \`185.220.101.52\`.

**Phase 2 — Investigation (15–60 min):**
4. Retrieve \`lsass.dmp\` from EDR quarantine for sandbox analysis.
5. Review all scheduled tasks created in the past 4 hours across impacted hosts.
6. Pull NTLM authentication logs from \`DC-01\` for lateral movement mapping.

**Phase 3 — Recovery:**
7. Re-image \`WKSTN-042\` from known-good baseline.
8. Issue new credentials and enforce MFA re-enrollment.`,
  },
  detection: {
    title: 'Detection Engineering — KQL / Sigma Rules',
    severity: 'medium',
    content: `**Microsoft Sentinel KQL Detection Rule:**

\`\`\`kusto
// LSASS Memory Dump Detection
DeviceProcessEvents
| where TimeGenerated > ago(24h)
| where ProcessCommandLine has_any ("lsass", "comsvcs.dll", "MiniDump", "rundll32")
| where InitiatingProcessFileName in~ ("cmd.exe", "powershell.exe", "wscript.exe")
| project TimeGenerated, DeviceName, AccountName,
          ProcessCommandLine, InitiatingProcessFileName
| order by TimeGenerated desc
\`\`\`

**Sigma Rule Metadata:**
\`\`\`yaml
title: Suspicious LSASS Access via Native Tools
status: stable
level: critical
logsource:
  category: process_creation
  product: windows
detection:
  keywords:
    - 'comsvcs.dll'
    - 'MiniDump'
\`\`\``,
  },
  risk: {
    title: 'Risk Assessment — CVSS 3.1 Analysis',
    severity: 'critical',
    content: `**Composite Risk Rating: CRITICAL — 9.2 / 10**

**CVSS 3.1 Vector:** AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H

| Impact Category | Rating | Rationale |
|---|---|---|
| Confidentiality | CRITICAL | Exposed domain admin credentials → full AD access |
| Integrity | CRITICAL | Admin access enables GPO modification, log tampering |
| Availability | HIGH | Ransomware execution capability confirmed on network |
| Business Impact | CRITICAL | Potential full domain compromise within 2–4 hours |

**Recommended Severity Level:** P1 — Critical Incident
**Escalation Required:** CISO, Legal, Executive Leadership`,
  },
};

const ANALYSIS_STEPS = [
  'Querying SIEM telemetry index...',
  'Mapping behaviors to MITRE ATT&CK matrix...',
  'Correlating with Threat Intelligence feeds...',
  'Cross-referencing active incident timeline...',
  'Generating analyst response recommendations...',
];

/* ─── Main Component ─────────────────────────────────────────────── */
export function SiemAiAssistant() {
  const { isAssistantOpen, setIsAssistantOpen } = useUI();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  if (!isAssistantOpen) return null;

  const handleSend = async (text) => {
    if (!text.trim() || isAnalyzing) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputValue('');
    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Step through status messages
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 550));
      setAnalysisStep(i);
    }

    const matchedPreset = PRESETS.find(p =>
      text.toLowerCase().includes(p.label.toLowerCase()) ||
      text.toLowerCase().includes(p.id)
    );
    const responseKey = matchedPreset ? matchedPreset.id : 'threat';
    const answer = MOCK_ANSWERS[responseKey];

    setIsAnalyzing(false);
    setMessages(prev => [...prev, {
      sender: 'assistant',
      title: answer.title,
      text: answer.content,
      severity: answer.severity,
    }]);
  };

  const handlePresetClick = (preset) => {
    handleSend(`Initiate investigation: ${preset.label}`);
  };

  const severityConfig = {
    critical: { color: '#ff2d55', label: 'CRITICAL', dot: 'bg-red-500' },
    high:     { color: '#ff6b35', label: 'HIGH',     dot: 'bg-orange-500' },
    medium:   { color: '#fbbf24', label: 'MEDIUM',   dot: 'bg-yellow-500' },
    low:      { color: '#10b981', label: 'LOW',       dot: 'bg-emerald-500' },
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[500px] md:w-[580px] flex-col shadow-2xl siem-assistant-panel">

      {/* ── 1. Classification Header ─────────────────────────────── */}
      <div className="siem-assistant-header px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,180,255,0.08) 100%)',
              border: '1px solid rgba(0,229,255,0.3)',
              boxShadow: '0 0 16px rgba(0,229,255,0.2)',
            }}
          >
            <Bot size={18} style={{ color: '#00e5ff' }} />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2"
              style={{ ringColor: 'var(--cyber-bg-panel)' }} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headings text-base font-bold tracking-wider uppercase"
                style={{ color: 'var(--cyber-text-bright)' }}>
                SIEM AI Assistant
              </h2>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold tracking-widest"
                style={{
                  background: 'rgba(0,229,255,0.1)',
                  border: '1px solid rgba(0,229,255,0.25)',
                  color: '#00e5ff',
                }}>
                SOC COPILOT
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--cyber-text-muted)' }}>
                Cybersecurity Investigation Engine Online
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAssistantOpen(false)}
          aria-label="Close SIEM AI Assistant"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
          style={{
            border: '1px solid var(--cyber-border-subtle)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--cyber-text-muted)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ff2d55';
            e.currentTarget.style.borderColor = 'rgba(255,45,85,0.3)';
            e.currentTarget.style.background = 'rgba(255,45,85,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--cyber-text-muted)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── 2. Classification Banner ─────────────────────────────── */}
      <div className="px-5 py-2 flex items-center gap-2"
        style={{
          background: 'rgba(0,229,255,0.04)',
          borderBottom: '1px solid rgba(0,229,255,0.08)',
        }}
      >
        <BookLock size={10} style={{ color: 'rgba(0,229,255,0.6)' }} />
        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(0,229,255,0.5)' }}>
          CLASSIFIED // AUTHORIZED SOC ANALYST ACCESS ONLY // TLP:RED
        </span>
      </div>

      {/* ── 3. Messages Panel ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          /* ── Empty State — Investigation Hub ─────── */
          <div className="space-y-5 py-2">
            {/* Welcome info banner */}
            <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(0,180,255,0.03) 100%)',
                border: '1px solid rgba(0,229,255,0.15)',
              }}
            >
              <div className="flex items-start gap-3">
                <ShieldCheck size={16} style={{ color: '#00e5ff', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 className="font-headings text-sm font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--cyber-text-bright)' }}>
                    Cybersecurity Investigation Hub
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--cyber-text-muted)' }}>
                    Submit natural language queries or select an investigation task below. The SIEM AI engine will correlate telemetry, map TTPs, and generate analyst-grade findings.
                  </p>
                </div>
              </div>
            </div>

            {/* Investigation task grid */}
            <div>
              <h4 className="font-mono text-[9px] font-bold uppercase tracking-widest px-1 mb-3"
                style={{ color: 'var(--cyber-text-muted)' }}>
                — Select Investigation Task —
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className="flex items-start gap-3 rounded-lg p-3 text-left transition-all duration-150 group"
                    style={{
                      border: '1px solid rgba(255,255,255,0.05)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)';
                      e.currentTarget.style.background = 'rgba(0,229,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
                      style={{
                        background: 'rgba(0,229,255,0.08)',
                        border: '1px solid rgba(0,229,255,0.15)',
                      }}
                    >
                      <preset.icon size={13} style={{ color: '#00e5ff' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-headings text-sm font-semibold"
                          style={{ color: 'var(--cyber-text-bright)' }}>
                          {preset.label}
                        </span>
                        <ChevronRight size={12} style={{ color: 'var(--cyber-text-dim)', flexShrink: 0 }} />
                      </div>
                      <span className="text-[11px] leading-tight mt-0.5 block" style={{ color: 'var(--cyber-text-muted)' }}>
                        {preset.desc}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Message Thread ──────────────────────── */
          <div className="space-y-5">
            {messages.map((msg, index) => (
              <AnimatePresence key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {msg.sender === 'user' ? (
                    /* User message */
                    <div className="max-w-[88%] rounded-xl px-4 py-3 siem-assistant-user-msg">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest mb-1.5"
                        style={{ color: 'var(--cyber-accent-cyan)', opacity: 0.7 }}>
                        // INVESTIGATION REQUEST
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--cyber-text-bright)' }}>
                        {msg.text}
                      </p>
                    </div>
                  ) : (
                    /* AI Assistant response */
                    <div className="w-full rounded-xl overflow-hidden siem-assistant-ai-msg">
                      {/* Response header */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            msg.severity === 'critical' || msg.severity === 'high' ? 'animate-pulse' : ''
                          }`}
                            style={{
                              background: severityConfig[msg.severity]?.color || '#fbbf24',
                              boxShadow: `0 0 8px ${severityConfig[msg.severity]?.color || '#fbbf24'}`,
                            }}
                          />
                          <h4 className="font-headings text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--cyber-text-bright)' }}>
                            {msg.title}
                          </h4>
                        </div>
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold flex-shrink-0"
                          style={{
                            background: `${severityConfig[msg.severity]?.color}18`,
                            color: severityConfig[msg.severity]?.color,
                            border: `1px solid ${severityConfig[msg.severity]?.color}40`,
                          }}
                        >
                          {severityConfig[msg.severity]?.label}
                        </span>
                      </div>

                      {/* Response body */}
                      <div className="px-4 py-4">
                        <div className="text-xs leading-relaxed space-y-2 whitespace-pre-line font-mono"
                          style={{ color: 'var(--cyber-text-base)' }}>
                          {msg.text}
                        </div>
                      </div>

                      {/* Response footer */}
                      <div className="flex items-center gap-2 px-4 py-2.5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <CheckCircle2 size={11} style={{ color: '#10b981' }} />
                        <span className="font-mono text-[9px] tracking-wider"
                          style={{ color: 'var(--cyber-text-dim)' }}>
                          SIEM AI Analysis Completed · Confidence: High · Engine v4.2.1
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ))}

            {/* Analysis in progress */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(0,0,0,0.1) 100%)',
                  border: '1px solid rgba(0,229,255,0.15)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 size={14} style={{ color: '#00e5ff' }} className="animate-spin flex-shrink-0" />
                  <span className="font-headings text-xs font-bold uppercase tracking-widest"
                    style={{ color: '#00e5ff' }}>
                    SIEM AI Engine Analyzing...
                  </span>
                </div>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((step, i) => (
                    <div key={i}
                      className="flex items-center gap-2.5 transition-all duration-300"
                      style={{ opacity: i <= analysisStep ? 1 : 0.25 }}
                    >
                      <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: i < analysisStep ? 'rgba(16,185,129,0.15)' : i === analysisStep ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${i < analysisStep ? 'rgba(16,185,129,0.35)' : i === analysisStep ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {i < analysisStep ? (
                          <CheckCircle2 size={9} style={{ color: '#10b981' }} />
                        ) : i === analysisStep ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        ) : (
                          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--cyber-text-dim)' }} />
                        )}
                      </div>
                      <span className="font-mono text-[10px]"
                        style={{ color: i <= analysisStep ? 'var(--cyber-text-base)' : 'var(--cyber-text-dim)' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── 4. Input Prompt ──────────────────────────────────────── */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
          className="relative flex items-center"
        >
          <Terminal size={13} className="absolute left-3.5 flex-shrink-0"
            style={{ color: 'rgba(0,229,255,0.4)' }} />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isAnalyzing}
            placeholder="Investigate threat · Explain log · Map MITRE ATT&CK..."
            className="w-full rounded-lg py-3 pl-10 pr-12 text-xs siem-assistant-input"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="submit"
            disabled={isAnalyzing || !inputValue.trim()}
            aria-label="Submit Investigation Query"
            className="absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150"
            style={{
              background: inputValue.trim() && !isAnalyzing ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${inputValue.trim() && !isAnalyzing ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
              color: inputValue.trim() && !isAnalyzing ? '#00e5ff' : 'var(--cyber-text-dim)',
              opacity: isAnalyzing ? 0.4 : 1,
              cursor: isAnalyzing || !inputValue.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={12} />
          </button>
        </form>
        <p className="font-mono text-[9px] text-center mt-2.5 tracking-wider"
          style={{ color: 'var(--cyber-text-dim)' }}>
          SIEM AI Engine v4.2.1 · Fine-Tuned Microsoft SecOps LLM · SOC Tier-3 Clearance
        </p>
      </div>
    </div>
  );
}

export default SiemAiAssistant;
