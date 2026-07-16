/**
 * AlertCard.jsx — SIEM Active Alert Incident Card
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Displays source IP, destination host, category, logs counts
 *   - Interactive actions: Acknowledge (Closed) | Investigate (In-progress)
 *   - Timestamp and analyst assignment information
 */

import { motion } from 'framer-motion';

const SEVERITY_COLORS = {
  critical: 'border-threat-critical/35 bg-threat-critical-glow text-threat-critical',
  high: 'border-threat-high-border bg-threat-high-glow text-threat-high',
  medium: 'border-threat-medium-border bg-threat-medium-glow text-threat-medium',
  low: 'border-threat-low-border bg-threat-low-glow text-threat-low',
};

const STATUS_LABELS = {
  open: 'bg-threat-critical-glow text-threat-critical border-threat-critical-border',
  investigating: 'bg-threat-high-glow text-threat-high border-threat-high-border',
  closed: 'bg-threat-low-glow text-threat-low border-threat-low-border',
};

export function AlertCard({
  alert, // { id, timestamp, title, category, severity, status, sourceIp, destHost, analyst, logsCount }
  onAcknowledge,
  onInvestigate,
  className = '',
}) {
  const sevClass = SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.medium;
  const statusClass = STATUS_LABELS[alert.status] ?? STATUS_LABELS.open;

  const date = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className={`
        rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel p-5 font-cyber flex flex-col gap-3.5
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-cyber-accent-cyan font-bold">
              {alert.id}
            </span>
            <span className="text-[10px] text-cyber-text-muted font-mono">
              {date}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-cyber-text-bright truncate mt-1">
            {alert.title}
          </h4>
        </div>

        {/* Severity Badge */}
        <span className={`px-2 py-0.5 text-[9px] font-bold font-mono uppercase border rounded ${sevClass}`}>
          {alert.severity}
        </span>
      </div>

      {/* Grid metadata */}
      <div className="grid grid-cols-2 gap-4 text-xs font-mono border-y border-cyber-border-muted py-2.5 my-1 text-cyber-text-muted">
        <div>
          <span className="text-[9px] uppercase text-cyber-text-muted/65 block">Source IP</span>
          <span className="text-cyber-text-bright">{alert.sourceIp ?? '—'}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase text-cyber-text-muted/65 block">Destination</span>
          <span className="text-cyber-text-bright truncate block">{alert.destHost ?? '—'}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase text-cyber-text-muted/65 block">Category</span>
          <span className="text-cyber-text-bright truncate block">{alert.category}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase text-cyber-text-muted/65 block">Analyst</span>
          <span className="text-cyber-text-bright truncate block">{alert.analyst}</span>
        </div>
      </div>

      {/* Row status details */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${statusClass}`}>
            {alert.status}
          </span>
          <span className="text-[10px] text-cyber-text-muted font-mono">
            {alert.logsCount ?? 0} associated logs
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {alert.status !== 'closed' && onAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge(alert.id)}
              className="h-7 px-2.5 rounded text-[10px] font-bold uppercase font-cyber border border-cyber-border-subtle bg-cyber-bg-accent text-cyber-text-muted hover:text-threat-low hover:border-threat-low-border transition-colors"
            >
              Acknowledge
            </button>
          )}
          {onInvestigate && (
            <button
              type="button"
              onClick={() => onInvestigate(alert.id)}
              className="h-7 px-2.5 rounded text-[10px] font-bold uppercase font-cyber bg-cyber-accent-cyan text-cyber-bg-deep shadow-cyan-neon hover:brightness-110 transition-all active:scale-95"
            >
              Investigate
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AlertCard;
