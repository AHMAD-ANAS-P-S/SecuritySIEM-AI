/* HelpCenterPage.jsx — Documentation, FAQs, and support for SIEM operators */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Search, ChevronDown, ChevronRight, BookOpen,
  Video, MessageCircle, FileText, ExternalLink, Keyboard,
  Shield, Terminal, Target, Brain, BarChart2, Activity, Zap,
  Star, ThumbsUp, Clock, Check,
} from 'lucide-react';

/* ─── Data ───────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  { icon: Shield, label: 'Alert Investigation Guide', desc: 'How to triage and escalate security alerts', color: '#ef4444', tag: 'Getting Started' },
  { icon: Terminal, label: 'KQL Query Reference', desc: 'Complete syntax reference for hunt queries', color: '#00f5ff', tag: 'Reference' },
  { icon: Target, label: 'MITRE ATT&CK Integration', desc: 'Mapping detections to tactics & techniques', color: '#f97316', tag: 'Framework' },
  { icon: Brain, label: 'AI Investigation Engine', desc: 'Using SIEM AI for advanced threat correlation and investigation', color: '#a855f7', tag: 'AI Features' },
  { icon: BarChart2, label: 'Dashboard Customization', desc: 'Creating custom widgets and views', color: '#22c55e', tag: 'UI Guide' },
  { icon: Activity, label: 'SOAR Playbook Creation', desc: 'Automating response workflows', color: '#4d9fff', tag: 'Automation' },
];

const FAQS = [
  {
    id: 'f1',
    question: 'How do I create a custom detection rule?',
    answer: `To create a custom detection rule:\n1. Navigate to Settings → Detection Rules\n2. Click "New Rule" and select the rule type (Threshold, Correlation, or AI-Assisted)\n3. Write your KQL query in the rule editor\n4. Set severity, MITRE mappings, and response actions\n5. Test against historical data using the "Dry Run" feature\n6. Enable and monitor the rule from the Rules Dashboard\n\nTip: Use the AI Rule Assistant to generate initial queries from natural language descriptions.`,
    category: 'Detection',
    helpful: 47,
  },
  {
    id: 'f2',
    question: 'What is the difference between Critical and High severity alerts?',
    answer: `**Critical** alerts indicate active threats requiring immediate response (within 15 minutes):\n- Active ransomware or data exfiltration\n- Confirmed system compromise\n- C2 beacon activity\n\n**High** severity requires response within 1 hour:\n- Brute force attacks with successful logins\n- Suspicious lateral movement\n- Known malware families detected\n\nSeverity is automatically assigned by our ML model based on IOC reputation, asset criticality, and behavioral context.`,
    category: 'Alerts',
    helpful: 83,
  },
  {
    id: 'f3',
    question: 'How do I integrate SIEM AI with our ticketing system?',
    answer: `SIEM AI supports native integration with:\n- **Jira Service Management** — Bidirectional sync\n- **ServiceNow** — Auto-ticket creation from critical alerts\n- **PagerDuty** — On-call escalation\n- **Slack/Teams** — Real-time notifications\n\nConfigure integrations at Settings → Integrations → ITSM Connectors. You'll need an API key and webhook URL from your ticketing provider.`,
    category: 'Integration',
    helpful: 62,
  },
  {
    id: 'f4',
    question: 'Can I export logs and reports in custom formats?',
    answer: `Yes. SIEM AI supports multiple export formats:\n- **PDF** — Formatted compliance and executive reports\n- **CSV/TSV** — Raw log data for analysis in Excel or SIEM\n- **JSON/NDJSON** — Machine-readable structured data\n- **Splunk CEF** — Common Event Format for forwarding\n- **STIX 2.1** — Threat intelligence sharing\n\nSchedule automated exports from Reports → Scheduled Exports, or export on-demand from any log view.`,
    category: 'Reports',
    helpful: 38,
  },
  {
    id: 'f5',
    question: 'How does the AI Investigation Engine work?',
    answer: `The AI Investigation Engine uses a security fine-tuned LLM that has been trained on:\n- MITRE ATT&CK framework knowledge\n- CVE and vulnerability databases\n- Threat intelligence feeds (VirusTotal, Shodan, AlienVault OTX)\n- Your organization's SIEM telemetry context\n\nIt can correlate events across multiple data sources, explain attack chains, and generate SOAR playbooks automatically. All analysis is performed within your secure environment — no data leaves your instance.`,
    category: 'AI Features',
    helpful: 91,
  },
  {
    id: 'f6',
    question: 'How do I set up multi-factor authentication for analyst accounts?',
    answer: `MFA is enabled organization-wide from Settings → Security → Authentication:\n1. Enable MFA enforcement for all or specific role groups\n2. Choose supported methods: TOTP (Google Authenticator, Authy), Hardware keys (YubiKey), SMS (not recommended)\n3. Set grace period for existing users\n4. Configure backup codes distribution policy\n\nAdmins can check MFA enrollment status from Settings → Users → MFA Status Report.`,
    category: 'Security',
    helpful: 29,
  },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Run KQL Query / Command Palette' },
  { keys: ['Ctrl', 'I'], action: 'Isolate Selected Host' },
  { keys: ['Ctrl', 'Shift', 'A'], action: 'Open AI Investigation' },
  { keys: ['Ctrl', '/'], action: 'Toggle Sidebar' },
  { keys: ['Ctrl', 'R'], action: 'Refresh Current View' },
  { keys: ['Esc'], action: 'Close Modal / Drawer' },
  { keys: ['↑', '↓'], action: 'Navigate Alert List' },
  { keys: ['Enter'], action: 'Open Selected Alert' },
];

const CATEGORIES = ['All', 'Detection', 'Alerts', 'Integration', 'Reports', 'AI Features', 'Security'];

/* ─── Sub-components ─────────────────────────────────────────────── */
function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.06)'}`, background: isOpen ? 'rgba(0,245,255,0.03)' : '#0a0f1a' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-start gap-3 flex-1 pr-4">
          <HelpCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: isOpen ? '#00f5ff' : '#64748b' }} />
          <span className="font-mono text-[11px] font-bold text-slate-200 leading-snug">{faq.question}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-full hidden sm:block"
            style={{ background: 'rgba(77,159,255,0.1)', color: '#4d9fff', border: '1px solid rgba(77,159,255,0.2)' }}>
            {faq.category}
          </span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} style={{ color: isOpen ? '#00f5ff' : '#64748b' }} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-5 pb-5">
              <div className="border-t mb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <div className="font-mono text-[10px] text-slate-400 leading-relaxed whitespace-pre-line space-y-1">
                {faq.answer.split('\n').map((line, i) => {
                  if (line.startsWith('- ') || line.startsWith('**')) {
                    const parts = line.replace('- ', '').split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i} className="flex gap-1.5">
                        {line.startsWith('- ') && <span className="text-slate-600 flex-shrink-0">•</span>}
                        <span>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-slate-200">{p}</strong> : p)}</span>
                      </p>
                    );
                  }
                  if (/^\d+\./.test(line)) {
                    return <p key={i} className="text-slate-300">{line}</p>;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="font-mono text-[9px] text-slate-600">Was this helpful?</span>
                <button className="flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-green-400 transition-colors font-mono text-[9px]">
                  <ThumbsUp size={10} /> {faq.helpful}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function HelpCenterPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState(null);
  const [activeSection, setActiveSection] = useState('faq');

  const filtered = FAQS.filter(faq => {
    const matchCat = category === 'All' || faq.category === category;
    const matchSearch = !search || faq.question.toLowerCase().includes(search.toLowerCase())
      || faq.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

      {/* Hero header */}
      <div className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(77,159,255,0.06) 50%, rgba(168,85,247,0.06) 100%)', border: '1px solid rgba(0,245,255,0.15)' }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(0,245,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(168,85,247,0.08) 0%, transparent 50%)' }} />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.3)' }}>
            <HelpCircle size={24} style={{ color: '#00f5ff' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">SIEM AI Documentation</h1>
          <p className="font-mono text-[11px] text-slate-400 mb-6">Comprehensive documentation for Security Operations Center platform capabilities</p>

          {/* Search */}
          <div className="flex items-center gap-3 max-w-lg mx-auto px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documentation, FAQs, guides…"
              className="bg-transparent font-mono text-[12px] text-slate-200 placeholder-slate-500 outline-none flex-1"
            />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-bold text-slate-200 text-sm mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -2 }}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${link.color}15`, border: `1px solid ${link.color}30` }}>
                <link.icon size={16} style={{ color: link.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] font-bold text-slate-200 leading-snug mb-0.5">{link.label}</p>
                <p className="font-mono text-[9px] text-slate-500 leading-relaxed">{link.desc}</p>
                <span className="inline-block mt-1.5 font-mono text-[8px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(77,159,255,0.1)', color: '#4d9fff', border: '1px solid rgba(77,159,255,0.2)' }}>
                  {link.tag}
                </span>
              </div>
              <ChevronRight size={13} className="text-slate-600 flex-shrink-0 mt-0.5" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { id: 'faq', label: 'FAQ', icon: HelpCircle },
          { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
          { id: 'support', label: 'Support', icon: MessageCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-200"
            style={{
              color: activeSection === tab.id ? '#00f5ff' : '#64748b',
              borderBottom: activeSection === tab.id ? '2px solid #00f5ff' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* FAQ Section */}
      {activeSection === 'faq' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-full font-mono text-[9px] transition-all duration-200"
                style={{
                  background: category === cat ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.03)',
                  color: category === cat ? '#00f5ff' : '#64748b',
                  border: `1px solid ${category === cat ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle size={32} className="mx-auto mb-3 text-slate-600" />
              <p className="font-mono text-[11px] text-slate-500">No results found for "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(faq => (
                <FaqItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openFaq === faq.id}
                  onToggle={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shortcuts section */}
      {activeSection === 'shortcuts' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <h2 className="font-bold text-slate-200 text-sm">Keyboard Shortcuts</h2>
            <p className="font-mono text-[10px] text-slate-500 mt-0.5">Speed up your workflow with these shortcuts</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <span className="font-mono text-[11px] text-slate-300">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j} className="font-mono text-[10px] px-2 py-1 rounded border font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' }}>
                      {key}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Support section */}
      {activeSection === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              icon: MessageCircle, title: 'Live Chat Support', desc: 'Chat with our security experts. Available 24/7 for enterprise plans.',
              color: '#22c55e', cta: 'Start Chat', status: 'Online — < 2 min response',
            },
            {
              icon: FileText, title: 'Submit a Ticket', desc: 'Create a support ticket for non-urgent issues or feature requests.',
              color: '#4d9fff', cta: 'Open Ticket', status: 'Avg. response: 4 hours',
            },
            {
              icon: Video, title: 'Schedule Training', desc: 'Book a 1-on-1 training session with a SIEM AI certified instructor.',
              color: '#a855f7', cta: 'Book Session', status: 'Next slot: Tomorrow 10:00 AM',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-6 flex flex-col"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${card.color}12`, border: `1px solid ${card.color}25` }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <h3 className="font-bold text-slate-100 text-[13px] mb-2">{card.title}</h3>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed flex-1 mb-4">{card.desc}</p>
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-mono text-[9px] text-slate-500">{card.status}</span>
              </div>
              <button className="w-full py-2.5 rounded-xl font-mono text-[10px] font-bold transition-all duration-200 hover:opacity-80"
                style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}>
                {card.cta}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
