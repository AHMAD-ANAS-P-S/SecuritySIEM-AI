/* SettingsPage.jsx — Enterprise Platform Configuration & Analyst Preferences */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Key, Sun, Moon, Save, Eye, EyeOff, Trash2,
  Shield, Globe, Database, Zap, Lock, RefreshCw, CheckCircle,
  AlertTriangle, Server, ChevronRight, Terminal, Plus, Copy,
  Sliders, Wifi, Clock
} from 'lucide-react';
import { useTheme } from '@hooks';

/* ─── Mock Data ──────────────────────────────────────────────────── */
const MOCK_API_KEYS = [
  {
    id: 'key1',
    name: 'SOAR Integration',
    created: '2026-01-15',
    lastUsed: '2 hours ago',
    prefix: 'sk-sai-a3f...1b2e',
    permissions: ['read', 'write', 'alerts'],
    status: 'active',
  },
  {
    id: 'key2',
    name: 'Log Exporter',
    created: '2026-03-22',
    lastUsed: 'Yesterday',
    prefix: 'sk-sai-b7d...4c1a',
    permissions: ['read', 'logs'],
    status: 'active',
  },
  {
    id: 'key3',
    name: 'Splunk Forwarder',
    created: '2026-05-01',
    lastUsed: '5 days ago',
    prefix: 'sk-sai-c2e...8f3d',
    permissions: ['read'],
    status: 'inactive',
  },
];

const INTEGRATION_STATUS = [
  { name: 'Microsoft Sentinel', type: 'SIEM', icon: Server, status: 'connected', latency: '18ms' },
  { name: 'CrowdStrike Falcon', type: 'EDR',  icon: Shield, status: 'connected', latency: '24ms' },
  { name: 'Splunk Enterprise',  type: 'SIEM', icon: Database, status: 'degraded', latency: '320ms' },
  { name: 'Palo Alto XSOAR',   type: 'SOAR', icon: Zap,    status: 'disconnected', latency: '--' },
];

const RETENTION_POLICIES = [
  { label: 'Hot Tier (Indexed)',    value: '90 days',  icon: Zap,      color: 'var(--cyber-accent-cyan)' },
  { label: 'Warm Tier (Archive)',   value: '1 year',   icon: Database, color: 'var(--cyber-accent-blue)' },
  { label: 'Cold Tier (Glacier)',   value: '7 years',  icon: Clock,    color: 'var(--cyber-text-muted)' },
];

/* ─── Style Helpers ──────────────────────────────────────────────── */
const INTEGRATION_STATUS_STYLE = {
  connected:    { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Connected',    badge: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  degraded:     { dot: 'bg-amber-400',   text: 'text-amber-400',   label: 'Degraded',     badge: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  disconnected: { dot: 'bg-red-400',     text: 'text-red-400',     label: 'Disconnected', badge: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] } }),
};

/* ─── Reusable Sub-components ─────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--cyber-border-muted)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--cyber-accent-cyan-glow)', border: '1px solid rgba(0,229,255,0.2)' }}>
        <Icon size={15} style={{ color: 'var(--cyber-accent-cyan)' }} />
      </div>
      <div>
        <h2 className="font-headings font-semibold text-base" style={{ color: 'var(--cyber-text-bright)' }}>{title}</h2>
        {subtitle && <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
      style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
      <div>
        <p className="font-mono text-[11px] font-medium" style={{ color: 'var(--cyber-text-base)' }}>{label}</p>
        <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none ${value ? '' : ''}`}
        style={{ background: value ? 'var(--cyber-accent-cyan)' : 'var(--cyber-border-subtle)', boxShadow: value ? '0 0 10px var(--cyber-accent-cyan-glow)' : 'none' }}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
        />
      </button>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--cyber-text-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-lg px-3 py-2.5 font-mono text-[11px] transition-all duration-200"
        style={{
          background: 'var(--cyber-bg-input)',
          border: `1px solid ${focused ? 'var(--cyber-border-glow)' : 'var(--cyber-border-subtle)'}`,
          color: 'var(--cyber-text-bright)',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px var(--cyber-accent-cyan-glow)' : 'none',
        }}
      />
    </div>
  );
}

/* ─── Page Tabs ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'integrations',  label: 'Integrations',  icon: Wifi },
  { id: 'data',          label: 'Data & Retention', icon: Database },
];

/* ─── Main Component ─────────────────────────────────────────────── */
export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: 'Analyst-42',
    email: 'analyst42@soc.siemplatform.io',
    role: 'Senior Security Analyst (Tier-3 SOC)',
    phone: '+1 (555) 0192',
    timezone: 'UTC+00:00',
  });
  const [notifs, setNotifs] = useState({
    email: true, slack: false, pagerduty: true,
    critical: true, high: true, medium: false, low: false,
    weeklyDigest: true, systemHealth: false,
  });
  const [security, setSecurity] = useState({
    mfa: true, sessionLog: true, ipAllowlist: false, auditAlerts: true,
  });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCopyKey = (id, prefix) => {
    navigator.clipboard.writeText(prefix);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleGenerateKey = () => {
    setGeneratingKey(true);
    setTimeout(() => setGeneratingKey(false), 2000);
  };

  return (
    <div className="p-4 lg:p-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--cyber-accent-cyan-glow)', border: '1px solid rgba(0,229,255,0.2)' }}>
            <Sliders size={16} style={{ color: 'var(--cyber-accent-cyan)' }} />
          </div>
          <h1 className="font-headings text-2xl font-bold" style={{ color: 'var(--cyber-text-bright)' }}>
            Platform Configuration
          </h1>
        </div>
        <p className="font-mono text-[10px] ml-11" style={{ color: 'var(--cyber-text-muted)' }}>
          Manage analyst profile, credentials, notification rules, integrations, and data policies
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Tab List */}
        <motion.nav
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex flex-row lg:flex-col gap-1 lg:w-48 flex-shrink-0"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 w-full"
                style={{
                  background: isActive ? 'var(--cyber-accent-cyan-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0,229,255,0.25)' : 'transparent'}`,
                  color: isActive ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-muted)',
                }}
              >
                <Icon size={14} />
                <span className="font-mono text-[10px] font-medium">{tab.label}</span>
                {isActive && <ChevronRight size={11} className="ml-auto" />}
              </button>
            );
          })}
        </motion.nav>

        {/* Right: Content Panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl p-6"
              style={{
                background: 'var(--cyber-bg-panel)',
                border: '1px solid var(--cyber-border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* === PROFILE TAB === */}
              {activeTab === 'profile' && (
                <div>
                  <SectionHeader icon={User} title="Analyst Identity" subtitle="Manage your SOC analyst credentials and contact information" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <FieldInput label="Display Name / Handle" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} placeholder="Analyst-42" />
                    <FieldInput label="Work Email (IAM)" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} placeholder="analyst@soc.company.io" />
                    <FieldInput label="Role / Clearance Level" value={profile.role} onChange={v => setProfile(p => ({ ...p, role: v }))} placeholder="Senior Analyst, Tier-3 SOC" />
                    <FieldInput label="Mobile (On-Call Alerting)" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} placeholder="+1 (555) 0000" />
                    <FieldInput label="Timezone" value={profile.timezone} onChange={v => setProfile(p => ({ ...p, timezone: v }))} placeholder="UTC+00:00" />
                  </div>

                  {/* Appearance */}
                  <div className="mb-6">
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--cyber-text-muted)' }}>Interface Appearance</div>
                    <div className="flex items-center justify-between rounded-lg px-4 py-3"
                      style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
                      <div>
                        <p className="font-mono text-[11px] font-medium" style={{ color: 'var(--cyber-text-base)' }}>
                          {isDark ? '🌙 Obsidian Dark Mode' : '☀️ Tactical Light Mode'}
                        </p>
                        <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                          {isDark ? 'Optimized for low-light SOC operations' : 'Optimized for high-ambient workstations'}
                        </p>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] transition-all"
                        style={{
                          background: 'var(--cyber-accent-cyan-glow)',
                          border: '1px solid rgba(0,229,255,0.25)',
                          color: 'var(--cyber-accent-cyan)',
                        }}
                      >
                        {isDark ? <Moon size={12} /> : <Sun size={12} />}
                        {isDark ? 'Dark' : 'Light'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* === NOTIFICATIONS TAB === */}
              {activeTab === 'notifications' && (
                <div>
                  <SectionHeader icon={Bell} title="Alert Delivery Channels" subtitle="Configure how and when the SIEM platform escalates security events to your team" />

                  <div className="space-y-2 mb-6">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>Delivery Channels</div>
                    <ToggleRow label="Email Alerts" desc="Send security alerts to analyst work email" value={notifs.email} onChange={v => setNotifs(p => ({ ...p, email: v }))} />
                    <ToggleRow label="Slack Workspace" desc="Push notifications to connected Slack SOC channel" value={notifs.slack} onChange={v => setNotifs(p => ({ ...p, slack: v }))} />
                    <ToggleRow label="PagerDuty On-Call" desc="Escalate critical incidents to on-call rotation" value={notifs.pagerduty} onChange={v => setNotifs(p => ({ ...p, pagerduty: v }))} />
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>Alert Severity Thresholds</div>
                    <ToggleRow label="CRITICAL — P0" desc="Always notify for P0/Critical severity events" value={notifs.critical} onChange={v => setNotifs(p => ({ ...p, critical: v }))} />
                    <ToggleRow label="HIGH — P1" desc="Notify for P1/High severity security events" value={notifs.high} onChange={v => setNotifs(p => ({ ...p, high: v }))} />
                    <ToggleRow label="MEDIUM — P2" desc="Notify for P2/Medium severity events" value={notifs.medium} onChange={v => setNotifs(p => ({ ...p, medium: v }))} />
                    <ToggleRow label="LOW — P3" desc="Informational alerts and low-priority findings" value={notifs.low} onChange={v => setNotifs(p => ({ ...p, low: v }))} />
                  </div>

                  <div className="space-y-2">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>Digest & Reports</div>
                    <ToggleRow label="Weekly SOC Digest" desc="Monday 08:00 UTC consolidated incident report" value={notifs.weeklyDigest} onChange={v => setNotifs(p => ({ ...p, weeklyDigest: v }))} />
                    <ToggleRow label="Platform Health Alerts" desc="Notify on collector outages or ingestion failures" value={notifs.systemHealth} onChange={v => setNotifs(p => ({ ...p, systemHealth: v }))} />
                  </div>
                </div>
              )}

              {/* === SECURITY TAB === */}
              {activeTab === 'security' && (
                <div>
                  <SectionHeader icon={Lock} title="Security & Access Controls" subtitle="Manage multi-factor authentication, session policies, and access restrictions" />

                  <div className="space-y-2 mb-6">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>Authentication</div>
                    <ToggleRow label="Multi-Factor Authentication (MFA)" desc="TOTP or hardware security key required on login" value={security.mfa} onChange={v => setSecurity(p => ({ ...p, mfa: v }))} />
                    <ToggleRow label="Session Activity Logging" desc="Log all analyst sessions and queries to audit trail" value={security.sessionLog} onChange={v => setSecurity(p => ({ ...p, sessionLog: v }))} />
                    <ToggleRow label="IP Allowlist Enforcement" desc="Restrict access to pre-approved CIDR ranges only" value={security.ipAllowlist} onChange={v => setSecurity(p => ({ ...p, ipAllowlist: v }))} />
                    <ToggleRow label="Privilege Escalation Alerts" desc="Alert on unusual role changes or permission grants" value={security.auditAlerts} onChange={v => setSecurity(p => ({ ...p, auditAlerts: v }))} />
                  </div>

                  <div className="mb-4">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: 'var(--cyber-text-muted)' }}>Session Security</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Session Timeout', value: '8 hours', icon: Clock },
                        { label: 'Max Concurrent Sessions', value: '2', icon: Terminal },
                        { label: 'Password Policy', value: 'Tier-3 Strict', icon: Lock },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg p-3 flex items-center gap-3"
                          style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
                          <item.icon size={14} style={{ color: 'var(--cyber-accent-cyan)', flexShrink: 0 }} />
                          <div>
                            <div className="font-mono text-[10px] font-semibold" style={{ color: 'var(--cyber-text-bright)' }}>{item.value}</div>
                            <div className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>{item.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Keys */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--cyber-text-muted)' }}>API Credentials</div>
                      <button
                        onClick={handleGenerateKey}
                        disabled={generatingKey}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider transition-all"
                        style={{
                          background: 'var(--cyber-accent-cyan-glow)',
                          border: '1px solid rgba(0,229,255,0.25)',
                          color: 'var(--cyber-accent-cyan)',
                          opacity: generatingKey ? 0.7 : 1,
                        }}
                      >
                        {generatingKey ? <RefreshCw size={10} className="animate-spin" /> : <Plus size={10} />}
                        {generatingKey ? 'Generating...' : 'New API Key'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {MOCK_API_KEYS.map(k => (
                        <div key={k.id} className="rounded-lg px-4 py-3"
                          style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${k.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}
                                style={{ boxShadow: k.status === 'active' ? '0 0 6px rgba(52,211,153,0.6)' : 'none' }} />
                              <div className="min-w-0">
                                <p className="font-mono text-[11px] font-medium" style={{ color: 'var(--cyber-text-bright)' }}>{k.name}</p>
                                <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                                  Created {k.created} · Last used {k.lastUsed}
                                </p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {k.permissions.map(p => (
                                    <span key={p} className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                                      style={{ background: 'var(--cyber-accent-cyan-glow)', color: 'var(--cyber-accent-cyan)', border: '1px solid rgba(0,229,255,0.15)' }}>
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1.5 rounded px-2 py-1.5"
                                style={{ background: 'var(--cyber-bg-deep)', border: '1px solid var(--cyber-border-subtle)' }}>
                                <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>
                                  {showKey[k.id] ? k.prefix : '••••••••••••••••'}
                                </span>
                                <button onClick={() => setShowKey(p => ({ ...p, [k.id]: !p[k.id] }))}
                                  className="transition-colors" style={{ color: 'var(--cyber-text-dim)' }}>
                                  {showKey[k.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                              </div>
                              <button
                                onClick={() => handleCopyKey(k.id, k.prefix)}
                                className="transition-colors"
                                style={{ color: copiedKey === k.id ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-dim)' }}
                              >
                                {copiedKey === k.id ? <CheckCircle size={13} /> : <Copy size={13} />}
                              </button>
                              <button className="transition-colors hover:text-red-400" style={{ color: 'var(--cyber-text-dim)' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* === INTEGRATIONS TAB === */}
              {activeTab === 'integrations' && (
                <div>
                  <SectionHeader icon={Wifi} title="Platform Integrations" subtitle="Manage connected security tools, SIEMs, EDR platforms, and SOAR orchestration systems" />

                  <div className="space-y-3 mb-6">
                    {INTEGRATION_STATUS.map((integration, i) => {
                      const st = INTEGRATION_STATUS_STYLE[integration.status];
                      const Icon = integration.icon;
                      return (
                        <motion.div
                          key={integration.name}
                          custom={i}
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-all duration-200"
                          style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--cyber-bg-deep)', border: '1px solid var(--cyber-border-subtle)' }}>
                              <Icon size={15} style={{ color: 'var(--cyber-accent-cyan)' }} />
                            </div>
                            <div>
                              <p className="font-mono text-[11px] font-medium" style={{ color: 'var(--cyber-text-bright)' }}>{integration.name}</p>
                              <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
                                Type: {integration.type} · Latency: {integration.latency}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-full"
                              style={{ background: st.badge, border: `1px solid ${st.border}` }}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                                style={{ boxShadow: integration.status === 'connected' ? '0 0 5px rgba(52,211,153,0.6)' : 'none' }} />
                              <span className={st.text}>{st.label}</span>
                            </span>
                            <button className="font-mono text-[9px] px-2.5 py-1 rounded transition-all"
                              style={{ background: 'var(--cyber-accent-cyan-glow)', color: 'var(--cyber-accent-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
                              {integration.status === 'disconnected' ? 'Connect' : 'Configure'}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg p-4" style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={13} style={{ color: 'var(--cyber-accent-amber)' }} />
                      <p className="font-mono text-[10px] font-medium" style={{ color: 'var(--cyber-accent-amber)' }}>Splunk Enterprise Degraded</p>
                    </div>
                    <p className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>
                      High API latency detected (320ms avg). Check Splunk forwarder agent status on collector nodes. This may impact log ingestion throughput.
                    </p>
                  </div>
                </div>
              )}

              {/* === DATA & RETENTION TAB === */}
              {activeTab === 'data' && (
                <div>
                  <SectionHeader icon={Database} title="Data Management & Retention" subtitle="Configure log retention policies, storage tiers, and data residency for compliance" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {RETENTION_POLICIES.map(pol => {
                      const Icon = pol.icon;
                      return (
                        <div key={pol.label} className="rounded-xl p-4 text-center"
                          style={{ background: 'var(--cyber-bg-accent)', border: '1px solid var(--cyber-border-muted)' }}>
                          <Icon size={20} className="mx-auto mb-2" style={{ color: pol.color }} />
                          <div className="font-mono text-lg font-bold mb-1" style={{ color: pol.color }}>{pol.value}</div>
                          <div className="font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--cyber-text-muted)' }}>{pol.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--cyber-text-muted)' }}>Data Handling Policies</div>
                    {[
                      { label: 'Automatic Data Tiering',     desc: 'Move aged logs from hot → warm → cold storage automatically', key: 'autoTier' },
                      { label: 'PII Masking / Redaction',    desc: 'Mask personally identifiable data in log records at ingestion', key: 'piiMask' },
                      { label: 'Compliance Mode (SOC 2)',    desc: 'Enforce audit trail immutability and deletion restriction', key: 'complianceMode' },
                      { label: 'Export Encryption (AES-256)', desc: 'Encrypt all data exports with AES-256 before delivery', key: 'exportEncrypt' },
                    ].map(item => (
                      <ToggleRow key={item.key} label={item.label} desc={item.desc}
                        value={item.key === 'autoTier' || item.key === 'exportEncrypt'}
                        onChange={() => {}} />
                    ))}
                  </div>

                  <div className="rounded-lg p-4 flex items-start gap-3"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--threat-critical)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="font-mono text-[10px] font-semibold mb-0.5" style={{ color: 'var(--threat-critical)' }}>
                        Danger Zone — Permanent Data Operations
                      </p>
                      <p className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>
                        Purging or re-indexing log data is irreversible. These operations require Tier-3 authorization and generate an audit event.
                      </p>
                      <button className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--threat-critical)' }}>
                        <Trash2 size={10} /> Request Data Purge
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end mt-4"
          >
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-all duration-300"
              style={{
                background: saved ? 'rgba(16,185,129,0.12)' : 'var(--cyber-accent-cyan-glow)',
                border: `1px solid ${saved ? 'rgba(16,185,129,0.35)' : 'rgba(0,229,255,0.3)'}`,
                color: saved ? 'var(--cyber-accent-green)' : 'var(--cyber-accent-cyan)',
                boxShadow: saved ? '0 0 12px rgba(16,185,129,0.15)' : '0 0 12px var(--cyber-accent-cyan-glow)',
              }}
            >
              {saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saved ? 'Configuration Saved' : 'Save Configuration'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
