/* NavItem.jsx - Individual menu links with hover overlays & active alert status indicators */
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export function NavItem({
  label,
  path,
  iconName,
  isActive,
  isCollapsed,
  badge,
  onClick
}) {
  // Dynamically resolve the icon component by its config string name
  const IconComponent = Icons[iconName] || Icons.HelpCircle;

  // Custom styling mappings for alert levels
  const getBadgeClasses = (type) => {
    switch (type) {
      case 'critical':
        return 'bg-threat-critical/10 text-threat-critical border-threat-critical/40';
      case 'high':
        return 'bg-threat-high/10 text-threat-high border-threat-high/40';
      case 'medium':
        return 'bg-threat-medium/10 text-threat-medium border-threat-medium/40';
      default:
        return 'bg-threat-info/10 text-threat-info border-threat-info/40';
    }
  };

  return (
    <div className="px-2">
      <button
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex w-full items-center gap-3 rounded px-3 py-2.5 font-sans text-xs font-medium uppercase tracking-wider transition-all duration-200 outline-none tooltip-cyber-trigger
          ${isActive 
            ? 'bg-cyber-bg-accent text-cyber-accent-cyan border-l-2 border-cyber-accent-cyan' 
            : 'text-cyber-text-base border-l-2 border-transparent hover:text-cyber-text-bright hover:bg-cyber-bg-accent/50'
          }
        `}
      >
        {/* Active layout sliding background glow element */}
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="absolute inset-0 bg-cyber-accent-cyan/[0.03] pointer-events-none rounded"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}

        {/* Navigation Icon wrapper with badge overlays */}
        <div className="relative flex items-center justify-center min-w-[18px]">
          <IconComponent size={16} className={isActive ? 'text-cyber-accent-cyan' : 'text-cyber-text-muted'} />
          
          {/* If collapsed, display critical/high notifications as a tiny top-right notification dot */}
          {isCollapsed && badge && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 
                ${badge.type === 'critical' ? 'bg-threat-critical' : 'bg-threat-high'}`} 
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 
                ${badge.type === 'critical' ? 'bg-threat-critical' : 'bg-threat-high'}`} 
              />
            </span>
          )}
        </div>

        {/* Collapsible Label Text */}
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 text-left whitespace-nowrap overflow-hidden font-mono text-[10px] font-semibold text-inherit"
          >
            {label}
          </motion.span>
        )}

        {/* Counter Badge - Right aligned (Only visible when sidebar is expanded) */}
        {!isCollapsed && badge && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`inline-flex items-center justify-center font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none
              ${getBadgeClasses(badge.type)}
            `}
          >
            {badge.count}
          </motion.span>
        )}

        {/* Collapsed Tooltip fallback */}
        {isCollapsed && (
          <div className="tooltip-cyber-content left-full ml-4 translate-x-0 bottom-auto top-1/2 -translate-y-1/2 font-mono z-50">
            <span className="text-[10px] text-cyber-text-bright">{label}</span>
            {badge && (
              <span className="text-[9px] block text-threat-critical mt-0.5">
                {badge.count} unresolved events
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

export default NavItem;
