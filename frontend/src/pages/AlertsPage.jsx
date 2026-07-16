/* AlertsPage.jsx — Full SIEM Alerts and Incidents Management Command Center */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, CheckSquare, Square,
  ShieldAlert, Clock, RefreshCw, Download, X,
} from 'lucide-react';

/* ─── Mock Data ──────────────────────────────────────────────────── */
const generateAlerts = () => {
  const types = [
    'Ransomware Execution Blocked',       'Brute Force Attack — RDP Protocol',
    'SQL Injection Vulnerability Attempt', 'Lateral Movement — PsExec Invocation',
    'Suspicious PowerShell Execution',    'Exfiltration of Confidential Data',
    'Trojan Command & Control Beacon',     'Log4Shell Exploitation Attempting',
    'Cryptominer Core Deployment',        'Cobalt Strike Beacon Detection',
    'Phishing Vector — Macro Payload',    'DNS Tunneling Tunnel Established',
    'Privilege Escalation Attempted',     'USB Data Leak Event',
    'LSASS Process Memory Extraction',     'API Abuse — Transaction Rate Limit',
  ];
  const sources = [
    '185.220.101.52', '45.33.32.156', '10.0.14.22',  '192.168.1.105',
    '203.0.113.44',   '10.0.4.88',   '172.16.0.55', '198.51.100.30',
  ];
  const dests = ['WKSTN-042', 'DC-01', 'WEB-SRV-03', 'MAIL-SRV-01', 'API-GW-01', 'DB-CLUSTER', 'FILE-SRV-02', 'S3-BUCKET'];
  const severities = ['critical', 'critical', 'high', 'high', 'high', 'medium', 'medium', 'medium', 'medium', 'low'];
  const statuses = ['open', 'investigating', 'closed'];
  const analysts = ['Analyst Vance', 'Chen Wei', 'Unassigned', 'Rivera J', 'Patel A'];
  const mitre = ['T1059', 'T1110', 'T1190', 'T1021', 'T1486', 'T1071', 'T1003', 'T1078'];

  return Array.from({ length: 52 }, (_, i) => {
    const sev = severities[Math.floor(Math.random() * severities.length)];
    const d = new Date(Date.now() - i * 8 * 60000);
    return {
      id: `INC-${9814 - i}`,
      time: d.toLocaleTimeString('en-US', { hour12: false }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      source: sources[i % sources.length],
      dest: dests[i % dests.length],
      type: types[i % types.length],
      severity: sev,
      status: statuses[i % statuses.length],
      assignee: analysts[i % analysts.length],
      mitre: mitre[i % mitre.length],
      logsCount: Math.floor(Math.random() * 180 + 20),
    };
  });
};

const ALL_ALERTS = generateAlerts();
const PAGE_SIZE = 12;

/* ─── Styles ─────────────────────────────────────────────────────── */
const SEV_STYLE = {
  critical: { bg: 'var(--threat-critical-glow)',  text: 'var(--threat-critical)', border: 'var(--threat-critical-border)' },
  high:     { bg: 'var(--threat-high-glow)',      text: 'var(--threat-high)',     border: 'var(--threat-high-border)' },
  medium:   { bg: 'var(--threat-medium-glow)',    text: 'var(--threat-medium)',   border: 'var(--threat-medium-border)' },
  low:      { bg: 'var(--threat-low-glow)',       text: 'var(--threat-low)',      border: 'var(--threat-low-border)' },
};

const ST_STYLE = {
  open:          { bg: 'var(--threat-critical-glow)', text: 'var(--threat-critical)', border: 'var(--threat-critical-border)' },
  investigating: { bg: 'var(--threat-medium-glow)',   text: 'var(--threat-medium)',   border: 'var(--threat-medium-border)' },
  closed:        { bg: 'var(--threat-low-glow)',      text: 'var(--threat-low)',      border: 'var(--threat-low-border)' },
};

const Pill = ({ label, style }) => (
  <span className="badge-cyber"
    style={{ background: style.bg, color: style.text, borderColor: style.border }}>
    {label}
  </span>
);

/* ─── FilterBar ──────────────────────────────────────────────────── */
function FilterBar({ filters, setFilters, onClear }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          placeholder="Query incidents by ID, origin host, destination segment..."
          className="input-cyber pl-9 py-2"
        />
      </div>

      {/* Severity */}
      <select
        value={filters.severity}
        onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}
        className="rounded-lg px-3 py-2 font-mono text-xs cursor-pointer bg-cyber-bg-input border border-cyber-border-subtle text-cyber-text-bright focus:outline-none"
      >
        <option value="">All Severity Thresholds</option>
        <option value="critical">Critical Severity</option>
        <option value="high">High Severity</option>
        <option value="medium">Medium Severity</option>
        <option value="low">Low Severity</option>
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
        className="rounded-lg px-3 py-2 font-mono text-xs cursor-pointer bg-cyber-bg-input border border-cyber-border-subtle text-cyber-text-bright focus:outline-none"
      >
        <option value="">All Incident States</option>
        <option value="open">Open / Triggered</option>
        <option value="investigating">Active Investigation</option>
        <option value="closed">Mitigated / Resolved</option>
      </select>

      {(filters.search || filters.severity || filters.status) && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <X size={13} /> Reset Filters
        </button>
      )}
    </div>
  );
}

/* ─── AlertRow (expandable) ──────────────────────────────────────── */
function AlertRow({ alert, isSelected, onSelect, isExpanded, onExpand }) {
  return (
    <>
      <tr
        className="transition-colors cursor-pointer"
        style={{
          background: isSelected ? 'var(--cyber-accent-cyan-glow)' : isExpanded ? 'var(--cyber-bg-accent)' : 'transparent',
        }}
        onClick={() => onExpand(alert.id)}
      >
        {/* Checkbox */}
        <td className="px-4 py-3" onClick={e => { e.stopPropagation(); onSelect(alert.id); }}>
          <button className="text-slate-500 hover:text-cyan-400 transition-colors">
            {isSelected ? <CheckSquare size={14} className="text-cyan-400" /> : <Square size={14} />}
          </button>
        </td>
        <td className="px-3 py-3 font-mono text-xs font-bold text-cyan-400 whitespace-nowrap">{alert.id}</td>
        <td className="px-3 py-3">
          <div className="font-mono text-xs text-cyber-text-bright whitespace-nowrap">{alert.time}</div>
          <div className="font-mono text-[10px] text-slate-500">{alert.date}</div>
        </td>
        <td className="px-3 py-3">
          <div className="font-mono text-xs text-cyber-text-base max-w-[220px] truncate">{alert.type}</div>
          <div className="font-mono text-[10px] text-sky-400 mt-0.5">{alert.mitre}</div>
        </td>
        <td className="px-3 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{alert.source}</td>
        <td className="px-3 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{alert.dest}</td>
        <td className="px-3 py-3">
          <Pill label={alert.severity} style={SEV_STYLE[alert.severity] || SEV_STYLE.low} />
        </td>
        <td className="px-3 py-3">
          <Pill label={alert.status} style={ST_STYLE[alert.status]} />
        </td>
        <td className="px-3 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{alert.assignee}</td>
        <td className="px-3 py-3">
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={10} style={{ padding: 0 }} className="border-b">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="px-6 py-4 grid grid-cols-3 gap-6 border-t"
                  style={{
                    background: 'var(--cyber-bg-accent)',
                    borderColor: 'var(--cyber-border-muted)',
                  }}
                >
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-2">// Payload Telemetry</p>
                    <div className="space-y-2">
                      {[
                        ['Host Origin', alert.source],
                        ['Target Entity', alert.dest],
                        ['MITRE TTP', alert.mitre],
                        ['Log Correlated', `${alert.logsCount} payload records`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="font-mono text-[10px] text-slate-500 w-24">{k}:</span>
                          <span className="font-mono text-[10px] text-cyber-text-bright">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-2">// Audit Trace</p>
                    <div className="space-y-2 border-l-2 pl-3" style={{ borderColor: 'var(--cyber-accent-cyan-glow)' }}>
                      {[
                        ['Telemetry generated', alert.time],
                        ['IOC mapping verdict', alert.time],
                        ['Security Desk notified', alert.time],
                      ].map(([ev, t]) => (
                        <div key={ev}>
                          <p className="font-mono text-[10px] text-slate-400">{ev}</p>
                          <p className="font-mono text-[9px] text-slate-500">{t} UTC</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-2">// Playbook Actions</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['Escalate Incident', 'Assign Desk', 'Suppress False Positive', 'Query Telemetry'].map(action => (
                        <button key={action} className="px-2.5 py-1.5 rounded font-mono text-[10px] btn-cyber btn-cyber-mono">
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function AlertsPage() {
  const [filters, setFilters] = useState({ search: '', severity: '', status: '' });
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return ALL_ALERTS.filter(a => {
      if (filters.severity && a.severity !== filters.severity) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return a.id.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) ||
          a.source.includes(q) || a.dest.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = id => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(a => a.id)));
  };

  return (
    <div className="p-5 lg:p-7 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title font-headings">Security Alerts Command Feed</h1>
          <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--cyber-text-muted)' }}>
            {filtered.length} correlated events &nbsp;·&nbsp; {ALL_ALERTS.filter(a => a.status === 'open').length} active triage queues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider btn-cyber btn-cyber-secondary">
            <Download size={13} /> Export Audited Feed
          </button>
          <button className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider btn-cyber btn-cyber-primary">
            <RefreshCw size={13} /> Sync Threat Feed
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <FilterBar filters={filters} setFilters={setFilters} onClear={() => { setFilters({ search: '', severity: '', status: '' }); setPage(1); }} />
      </div>

      {/* Bulk actions orchestration */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl px-5 py-3 mb-4 flex items-center gap-4"
            style={{
              background: 'var(--cyber-accent-cyan-glow)',
              border: '1px solid var(--cyber-border-accent)',
            }}
          >
            <span className="font-mono text-xs font-bold" style={{ color: 'var(--cyber-accent-cyan)' }}>
              {selected.size} correlated incidents selected
            </span>
            <div className="flex gap-2">
              {['Escalate Incident', 'Assign Desk Owner', 'Resolve Triage', 'Suppress Signatures'].map(action => (
                <button key={action} onClick={() => setSelected(new Set())} className="btn-cyber btn-cyber-mono px-3 py-1">
                  {action}
                </button>
              ))}
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-slate-300">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Command Grid */}
      <div className="table-cyber-container">
        <table className="table-cyber w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-slate-500 hover:text-cyan-400 transition-colors">
                  {selected.size === paged.length && paged.length > 0
                    ? <CheckSquare size={14} className="text-cyan-400" />
                    : <Square size={14} />
                  }
                </button>
              </th>
              {['Incident ID', 'Timestamp', 'Incident Classification', 'Origin Context', 'Target Entity', 'Severity', 'State', 'Assigned Desk', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <p className="font-mono text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
                    No security alerts currently matched the active search parameters.
                  </p>
                </td>
              </tr>
            ) : (
              paged.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isSelected={selected.has(alert.id)}
                  onSelect={toggleSelect}
                  isExpanded={expanded === alert.id}
                  onExpand={id => setExpanded(prev => prev === id ? null : id)}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination command footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-cyber-bg-deep border-t" style={{ borderColor: 'var(--cyber-border-subtle)' }}>
          <span className="font-mono text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
            Triage Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} audited instances
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded font-mono text-xs disabled:opacity-30 transition-colors border bg-cyber-bg-panel border-cyber-border-subtle text-cyber-text-base hover:border-cyber-accent-cyan"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return pg <= totalPages ? (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className="w-8 h-8 rounded font-mono text-xs transition-all border"
                  style={{
                    background: pg === page ? 'var(--cyber-accent-cyan)' : 'var(--cyber-bg-panel)',
                    borderColor: pg === page ? 'var(--cyber-accent-cyan)' : 'var(--cyber-border-subtle)',
                    color: pg === page ? '#000' : 'var(--cyber-text-base)',
                    fontWeight: pg === page ? '700' : '500',
                  }}
                >
                  {pg}
                </button>
              ) : null;
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded font-mono text-xs disabled:opacity-30 transition-colors border bg-cyber-bg-panel border-cyber-border-subtle text-cyber-text-base hover:border-cyber-accent-cyan"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
