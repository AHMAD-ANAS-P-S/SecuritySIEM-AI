/**
 * StatCard.jsx — SIEM Operational Stat Widget Card
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Display numerical stats with custom labels
 *   - Positive/Negative trend indicator with colored arrows
 *   - Glow accent containers, optional background indicators
 */

import { motion } from 'framer-motion';

const COLOR_CONFIGS = {
  cyan: {
    text: 'text-cyber-accent-cyan',
    bg: 'bg-cyber-accent-cyan/10',
    border: 'border-cyber-accent-cyan/20',
    glow: 'rgba(0, 240, 255, 0.15)',
  },
  red: {
    text: 'text-threat-critical',
    bg: 'bg-threat-critical/10',
    border: 'border-threat-critical-border',
    glow: 'rgba(255, 46, 84, 0.15)',
  },
  green: {
    text: 'text-threat-low',
    bg: 'bg-threat-low/10',
    border: 'border-threat-low-border',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  blue: {
    text: 'text-cyber-accent-blue',
    bg: 'bg-cyber-accent-blue/10',
    border: 'border-cyber-accent-blue/20',
    glow: 'rgba(56, 189, 248, 0.15)',
  },
};

export function StatCard({
  label,
  value,
  delta,
  deltaType = 'increase', // 'increase' | 'decrease'
  icon: Icon,
  color = 'cyan',
  unit = '',
  className = '',
}) {
  const c = COLOR_CONFIGS[color] ?? COLOR_CONFIGS.cyan;
  const isPositive = deltaType === 'increase';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel p-5 font-cyber
        ${className}
      `}
    >
      {/* Background glow node */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ backgroundColor: c.glow }}
      />

      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${c.bg} ${c.border}`}>
            <Icon size={16} className={c.text} />
          </div>
        )}

        {delta !== undefined && (
          <div className={`
            flex items-center gap-0.5 text-[10px] font-mono font-semibold
            ${isPositive ? 'text-threat-low' : 'text-threat-critical'}
          `}>
            {isPositive ? '▲' : '▼'} {Math.abs(delta)}%
          </div>
        )}
      </div>

      <div className={`text-2xl font-bold font-mono tracking-tight ${c.text}`}>
        {value}
        {unit && <span className="text-xs font-normal text-cyber-text-muted ml-1">{unit}</span>}
      </div>

      <div className="text-[10px] text-cyber-text-muted uppercase tracking-wider mt-1.5 font-mono">
        {label}
      </div>
    </motion.div>
  );
}

export default StatCard;
