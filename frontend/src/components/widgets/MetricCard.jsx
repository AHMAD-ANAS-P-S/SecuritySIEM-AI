/**
 * MetricCard.jsx — SIEM Interactive Metric Card with Inline Sparkline
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Numeric stat display
 *   - Custom dynamic SVG sparkline based on input array
 *   - Accessible tooltips, hover card animations
 */

import { motion } from 'framer-motion';

export function MetricCard({
  title,
  value,
  sparklineData = [], // array of numbers, e.g. [12, 14, 18, 11, 20, 24]
  status = 'default', // 'default' | 'critical' | 'high' | 'low'
  unit = '',
  description,
  className = '',
}) {
  const statusColors = {
    default: 'stroke-cyber-accent-blue text-cyber-accent-blue',
    critical: 'stroke-threat-critical text-threat-critical',
    high: 'stroke-threat-high text-threat-high',
    low: 'stroke-threat-low text-threat-low',
  };

  const colorClass = statusColors[status] ?? statusColors.default;

  // Generate SVG path for sparkline
  const generatePath = () => {
    if (sparklineData.length < 2) return '';
    const width = 120;
    const height = 30;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min === 0 ? 1 : max - min;

    const points = sparklineData.map((val, index) => {
      const x = (index / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const path = generatePath();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`
        rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel p-5 font-cyber flex justify-between items-center gap-4
        ${className}
      `}
    >
      <div className="space-y-1">
        <span className="text-[10px] text-cyber-text-muted uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className="text-xl font-bold font-mono text-cyber-text-bright">
          {value}
          {unit && <span className="text-xs font-normal text-cyber-text-muted ml-0.5">{unit}</span>}
        </div>
        {description && (
          <p className="text-xs text-cyber-text-muted mt-1 leading-snug">
            {description}
          </p>
        )}
      </div>

      {/* Inline Sparkline */}
      {sparklineData.length >= 2 && (
        <div className="w-28 h-10 shrink-0">
          <svg viewBox="0 0 120 30" className="w-full h-full">
            <path
              d={path}
              fill="none"
              className={colorClass}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

export default MetricCard;
