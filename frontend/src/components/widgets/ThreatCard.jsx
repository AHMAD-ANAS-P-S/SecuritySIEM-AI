/**
 * ThreatCard.jsx — SIEM Threat Intelligence Feed Card
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Display active malware process signature or hash
 *   - Severity level badge integration
 *   - Compromised endpoints/hosts lists
 *   - Action shortcuts (Isolate Host, View Signatures)
 */

import { motion } from 'framer-motion';

const SEVERITY_COLORS = {
  critical: 'border-threat-critical/35 bg-threat-critical-glow text-threat-critical',
  high: 'border-threat-high-border bg-threat-high-glow text-threat-high',
  medium: 'border-threat-medium-border bg-threat-medium-glow text-threat-medium',
  low: 'border-threat-low-border bg-threat-low-glow text-threat-low',
};

export function ThreatCard({
  threat, // { id, name, signature, severity, source, detectedCount, compromisedHosts: [] }
  onIsolate,
  onInvestigate,
  className = '',
}) {
  const sevClass = SEVERITY_COLORS[threat.severity] ?? SEVERITY_COLORS.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel/70 p-5 font-cyber
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span className="font-mono text-[9px] text-cyber-text-muted uppercase tracking-wider">
            {threat.id} // {threat.source}
          </span>
          <h4 className="text-sm font-semibold text-cyber-text-bright truncate mt-0.5">
            {threat.name}
          </h4>
        </div>
        <span className={`px-2 py-0.5 text-[9px] font-bold font-mono uppercase border rounded ${sevClass}`}>
          {threat.severity}
        </span>
      </div>

      {/* Signature info */}
      <div className="rounded bg-cyber-bg-input border border-cyber-border-muted p-2 text-xs font-mono mb-4 text-cyber-text-muted flex justify-between items-center">
        <span className="truncate pr-4">{threat.signature}</span>
        <span className="shrink-0 text-cyber-text-bright font-bold">×{threat.detectedCount}</span>
      </div>

      {/* Compromised Hosts */}
      {threat.compromisedHosts && threat.compromisedHosts.length > 0 && (
        <div className="mb-4 space-y-1">
          <span className="text-[9px] font-mono text-cyber-text-muted uppercase tracking-widest block">
            Impacted Assets:
          </span>
          <div className="flex flex-wrap gap-1">
            {threat.compromisedHosts.map((host) => (
              <span
                key={host}
                className="px-2 py-0.5 rounded-md bg-cyber-bg-accent border border-cyber-border-subtle text-[10px] font-mono text-cyber-text-base"
              >
                {host}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action controls */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cyber-border-muted mt-2">
        {threat.compromisedHosts && threat.compromisedHosts.length > 0 && onIsolate && (
          <button
            type="button"
            onClick={() => onIsolate(threat.compromisedHosts)}
            className="px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider text-threat-critical border border-threat-critical-border bg-threat-critical/10 hover:bg-threat-critical hover:text-white transition-colors"
          >
            Isolate Host
          </button>
        )}
        <button
          type="button"
          onClick={() => onInvestigate?.(threat)}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider text-cyber-accent-cyan border border-cyber-accent-cyan/40 bg-cyber-accent-cyan/10 hover:bg-cyber-accent-cyan hover:text-cyber-bg-deep transition-colors"
        >
          Investigate
        </button>
      </div>
    </motion.div>
  );
}

export default ThreatCard;
