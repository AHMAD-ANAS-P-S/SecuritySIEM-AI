/* HistoryPage.jsx — Event log explorer with full-text search, filters, and timeline */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Clock, Download, ChevronDown, ChevronRight,
  ChevronLeft, Terminal, Globe, Cpu, Database, Shield, User,
  AlertTriangle, RefreshCw, X, Hash, Activity,
} from 'lucide-react';

/* ─── Mock Log Data ───────────────────────────────────────────────── */
const LOG_TYPES = ['Authentication', 'Network', 'Process', 'File System', 'Registry', 'DNS', 'Firewall', 'EDR'];
const LOG_SOURCES = ['WinEventLog:Security', 'Sysmon', 'CrowdStrike EDR', 'Palo Alto FW', 'Okta SSO', 'AWS CloudTrail', 'Azure AD', 'Zscaler'];
const SEVERITY_OPTS = ['critical', 'high', 'medium', 'low', 'info'];

const generateLogs = () => {
  const messages = [
    { msg: 'Process created: powershell.exe -EncodedCommand JAB…', type: 'Process', sev: 'critical' },
    { msg: 'Network connection to 185.220.101.52:443 blocked', type: 'Network', sev: 'high' },
    { msg: 'Failed logon attempt for user Administrator (x47)', type: 'Authentication', sev: 'high' },
    { msg: 'Successful Kerberos TGS request — RC4 encryption', type: 'Authentication', sev: 'high' },
    { msg: 'File modified: C:\\Windows\\System32\\svchost.exe', type: 'File System', sev: 'critical' },
    { msg: 'DNS query to evil-c2.xyz — matched threat intel', type: 'DNS', sev: 'critical' },
    { msg: 'Registry key created: HKLM\\SOFTWARE\\Microsoft\\Run\\malware', type: 'Registry', sev: 'high' },
    { msg: 'Lateral movement detected via SMB share access', type: 'Network', sev: 'high' },
    { msg: 'User logon: DOMAIN\\jdoe from 192.168.1.105', type: 'Authentication', sev: 'info' },
    { msg: 'Firewall rule triggered: Block Tor Exit Nodes', type: 'Firewall', sev: 'medium' },
    { msg: 'Antivirus scan completed — 0 threats found', type: 'EDR', sev: 'info' },
    { msg: 'Anomalous parent-child process: Word.exe → cmd.exe', type: 'Process', sev: 'high' },
    { msg: 'Data transfer to S3-BUCKET: 48 GB in 12 minutes', type: 'Network', sev: 'critical' },
    { msg: 'Certificate validation failed for api.example.com', type: 'Network', sev: 'medium' },
    { msg: 'Scheduled task created: SvcHostHelper at startup', type: 'Process', sev: 'high' },
    { msg: 'AWS CloudTrail: IAM policy attached to EC2 instance', type: 'File System', sev: 'medium' },
    { msg: 'OAuth token issued to suspicious application', type: 'Authentication', sev: 'medium' },
    { msg: 'Process terminated by EDR: Agent Tesla dropper', type: 'EDR', sev: 'high' },
    { msg: 'LSASS memory access from mimikatz.exe', type: 'Process', sev: 'critical' },
    { msg: 'Successful MFA push notification from Russia', type: 'Authentication', sev: 'critical' },
  ];

  return Array.from({ length: 200 }, (_, i) => {
    const base = messages[i % messages.length];
    const d = new Date(Date.now() - i * 4 * 60000);
    return {
      id: `LOG-${100000 - i}`,
      timestamp: d.toISOString().replace('T', ' ').slice(0, 19),
      type: base.type,
      severity: base.sev,
      source: LOG_SOURCES[i % LOG_SOURCES.length],
      host: ['WKSTN-042', 'DC-01', 'WEB-SRV-03', 'MAIL-SRV-01', 'API-GW-01'][i % 5],
      user: ['DOMAIN\\svc-deploy', 'DOMAIN\\admin', 'DOMAIN\\jdoe', 'NT AUTHORITY\\SYSTEM', 'DOMAIN\\guest'][i % 5],
      message: base.msg,
      eventId: Math.floor(Math.random() * 9000 + 1000),
      pid: Math.floor(Math.random() * 60000 + 1000),
    };
  });
};

const ALL_LOGS = generateLogs();
const PAGE_SIZE = 20;

const SEV_STYLE = {
  critical: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', dot: '#ef4444' },
  high:     { text: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', dot: '#f97316' },
  medium:   { text: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  dot: '#eab308' },
  low:      { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  dot: '#22c55e' },
  info:     { text: '#4d9fff', bg: 'rgba(77,159,255,0.1)', border: 'rgba(77,159,255,0.25)', dot: '#4d9fff' },
};

const TYPE_ICONS = {
  Authentication: User,
  Network: Globe,
  Process: Terminal,
  'File System': Database,
  Registry: Hash,
  DNS: Globe,
  Firewall: Shield,
  EDR: Shield,
};

/* ─── Log Detail Drawer ──────────────────────────────────────────── */
function LogDetailDrawer({ log, onClose }) {
  if (!log) return null;
  const sev = SEV_STYLE[log.severity];
  const Icon = TYPE_ICONS[log.type] || Activity;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed right-0 top-0 h-screen w-96 z-50 flex flex-col border-l"
      style={{ background: 'var(--cyber-bg-panel)', borderColor: 'var(--cyber-border-subtle)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
            <Icon size={13} style={{ color: sev.text }} />
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-200">Forensic Event Detail</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cyber-border-subtle)' }}>
          {[
            ['Log ID', log.id],
            ['Timestamp', log.timestamp],
            ['Severity', log.severity],
            ['Type', log.type],
            ['Source', log.source],
            ['Host', log.host],
            ['User', log.user],
            ['Event ID', log.eventId],
            ['PID', log.pid],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-3">
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">{k}</span>
              <span className="font-mono text-[10px] text-slate-200 break-all">{v}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mb-2">Raw Message</p>
          <div className="rounded-xl p-4 font-mono text-[10px] text-slate-300 leading-relaxed"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--cyber-border-subtle)' }}>
            {log.message}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl font-mono text-[10px] text-cyan-400 border transition-colors hover:bg-cyan-400/10"
            style={{ borderColor: 'rgba(0,245,255,0.25)' }}>
            Investigate
          </button>
          <button className="flex-1 py-2.5 rounded-xl font-mono text-[10px] text-orange-400 border transition-colors hover:bg-orange-400/10"
            style={{ borderColor: 'rgba(249,115,22,0.25)' }}>
            Create Alert
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return ALL_LOGS.filter(log => {
      const matchSev = filterSev === 'all' || log.severity === filterSev;
      const matchType = filterType === 'all' || log.type === filterType;
      const matchSearch = !search || log.message.toLowerCase().includes(search.toLowerCase())
        || log.host.toLowerCase().includes(search.toLowerCase())
        || log.id.toLowerCase().includes(search.toLowerCase())
        || log.user.toLowerCase().includes(search.toLowerCase());
      return matchSev && matchType && matchSearch;
    });
  }, [search, filterSev, filterType]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (key, value) => {
    if (key === 'sev') { setFilterSev(value); setPage(1); }
    if (key === 'type') { setFilterType(value); setPage(1); }
  };

  return (
    <>
      <div className="p-4 lg:p-6 space-y-4 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} style={{ color: '#00f5ff' }} />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Forensic Log Investigation</span>
            </div>
            <h1 className="text-xl font-bold text-white">Audit Timeline &amp; Log Explorer</h1>
            <p className="font-mono text-[10px] text-slate-500 mt-0.5">
              Chronological audit trail, security event correlation history, and forensic log investigation · {filtered.length.toLocaleString()} indexed events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Download size={11} /> Export
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={11} /> Live
            </button>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl flex-1 min-w-64"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={13} className="text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search audit events, correlation IDs, or analyst actions…"
              className="bg-transparent font-mono text-[11px] text-slate-200 placeholder-slate-600 outline-none flex-1"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="text-slate-500 hover:text-slate-300">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-mono text-[10px] transition-colors"
            style={{
              background: showFilters ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: showFilters ? '1px solid rgba(0,245,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: showFilters ? '#00f5ff' : '#64748b',
            }}
          >
            <Filter size={11} /> Filters
            {(filterSev !== 'all' || filterType !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
                <div>
                  <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mb-2">Threat Severity Classification</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['all', ...SEVERITY_OPTS].map(sev => {
                      const sc = SEV_STYLE[sev];
                      return (
                        <button
                          key={sev}
                          onClick={() => handleFilter('sev', sev)}
                          className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize transition-all duration-200"
                          style={{
                            background: filterSev === sev ? (sc?.bg || 'rgba(0,245,255,0.15)') : 'rgba(255,255,255,0.03)',
                            color: filterSev === sev ? (sc?.text || '#00f5ff') : '#64748b',
                            border: `1px solid ${filterSev === sev ? (sc?.border || 'rgba(0,245,255,0.3)') : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mb-2">Telemetry Source Type</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['all', ...LOG_TYPES].map(t => (
                      <button
                        key={t}
                        onClick={() => handleFilter('type', t)}
                        className="px-2.5 py-1 rounded-full font-mono text-[9px] capitalize transition-all duration-200"
                        style={{
                          background: filterType === t ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.03)',
                          color: filterType === t ? '#00f5ff' : '#64748b',
                          border: `1px solid ${filterType === t ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Log table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          {/* Table header */}
          <div className="grid gap-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', gridTemplateColumns: '110px 80px 90px 110px 1fr 80px' }}>
            {['Timestamp', 'Severity', 'Type', 'Host', 'Message', 'Event ID'].map(h => (
              <div key={h} className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-slate-600">{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
            {paginated.map((log, i) => {
              const sev = SEV_STYLE[log.severity];
              const Icon = TYPE_ICONS[log.type] || Activity;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedLog(log)}
                  className="grid cursor-pointer hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: '110px 80px 90px 110px 1fr 80px' }}
                >
                  <div className="px-3 py-2.5 font-mono text-[9px] text-slate-500 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sev.dot }} />
                    {log.timestamp.slice(11)}
                  </div>
                  <div className="px-3 py-2.5 flex items-center">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded capitalize"
                      style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {log.severity}
                    </span>
                  </div>
                  <div className="px-3 py-2.5 flex items-center gap-1.5">
                    <Icon size={10} style={{ color: '#64748b' }} />
                    <span className="font-mono text-[9px] text-slate-500 truncate">{log.type}</span>
                  </div>
                  <div className="px-3 py-2.5 font-mono text-[9px] text-cyan-400 flex items-center truncate">{log.host}</div>
                  <div className="px-3 py-2.5 font-mono text-[10px] text-slate-300 flex items-center truncate">{log.message}</div>
                  <div className="px-3 py-2.5 font-mono text-[9px] text-slate-600 flex items-center">{log.eventId}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="font-mono text-[10px] text-slate-500">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page - 2 + i;
                if (pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className="w-7 h-7 rounded-lg font-mono text-[10px] transition-all duration-200"
                    style={{
                      background: pg === page ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.04)',
                      color: pg === page ? '#00f5ff' : '#64748b',
                      border: `1px solid ${pg === page ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log detail drawer */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
