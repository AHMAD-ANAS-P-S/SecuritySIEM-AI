/**
 * ActivityCard.jsx — SIEM Live Telemetry & Activity Feed Card
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Staggered timeline list for audit activities or streaming logs
 *   - Visual indicator rings per activity classification (info | warn | alert)
 *   - Clean layout with timestamp and analyst label
 */

import { motion } from 'framer-motion';

const STATUS_ICONS = {
  info: 'bg-cyber-accent-blue/15 border-cyber-accent-blue/40 text-cyber-accent-blue',
  warning: 'bg-threat-high-glow border-threat-high-border text-threat-high',
  alert: 'bg-threat-critical-glow border-threat-critical-border text-threat-critical',
  success: 'bg-threat-low-glow border-threat-low-border text-threat-low',
};

export function ActivityCard({
  activities = [], // [{ id, time, title, description, type: 'info' | 'warning' | 'alert' | 'success' }]
  title = 'System Activity Feed',
  className = '',
}) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <div
      className={`
        rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel p-5 font-cyber
        ${className}
      `}
    >
      <div className="border-b border-cyber-border-muted pb-3 mb-4">
        <h4 className="text-sm font-semibold text-cyber-text-bright">
          {title}
        </h4>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative border-l border-cyber-border-muted pl-4 ml-2 space-y-5"
      >
        {activities.map((act) => {
          const statusClass = STATUS_ICONS[act.type] ?? STATUS_ICONS.info;
          return (
            <motion.div
              key={act.id}
              variants={item}
              className="relative flex flex-col gap-1.5"
            >
              {/* Timeline indicator node */}
              <span className={`
                absolute -left-[25px] top-1 flex items-center justify-center w-4.5 h-4.5 rounded-full border text-[9px] bg-cyber-bg-panel font-bold
                ${statusClass}
              `}>
                ●
              </span>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-cyber-text-bright">
                  {act.title}
                </span>
                <span className="text-[10px] text-cyber-text-muted font-mono whitespace-nowrap">
                  {act.time}
                </span>
              </div>
              
              {act.description && (
                <p className="text-xs text-cyber-text-muted leading-relaxed font-sans">
                  {act.description}
                </p>
              )}
            </motion.div>
          );
        })}
        {activities.length === 0 && (
          <p className="text-center text-xs text-cyber-text-muted py-6">No recent activity detected.</p>
        )}
      </motion.div>
    </div>
  );
}

export default ActivityCard;
