/* SidebarFooter.jsx - Panel footer displaying logged analyst profile details & utility buttons */
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, ShieldCheck } from 'lucide-react';

export function SidebarFooter({ isCollapsed, onLogout, onSettings }) {
  const user = {
    username: 'Analyst Vance',
    id: 'L3-4042',
    clearance: 'L3 Analyst',
    avatarInitials: 'AV'
  };

  return (
    <div className="border-t border-cyber-border-muted bg-cyber-bg-panel/40 px-2 py-3">
      <AnimatePresence mode="wait">
        {!isCollapsed ? (
          <motion.div
            key="expanded-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between"
          >
            {/* User Profile Info */}
            <div className="flex items-center gap-2.5">
              {/* Glowing Avatar circle */}
              <div className="relative flex h-8 w-8 items-center justify-center rounded border border-cyber-accent-cyan bg-cyber-bg-deep text-xs font-mono font-bold text-cyber-accent-cyan shadow-[0_0_8px_var(--cyber-accent-cyan-glow)]">
                {user.avatarInitials}
                {/* Active Indicator green LED */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-threat-low ring-1 ring-cyber-bg-deep" />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-semibold text-cyber-text-bright font-sans leading-none">
                  {user.username}
                </span>
                <span className="flex items-center gap-0.5 mt-0.5 text-[9px] font-mono font-medium text-cyber-text-muted">
                  <ShieldCheck size={9} className="text-cyber-accent-blue" />
                  {user.clearance}
                </span>
              </div>
            </div>

            {/* Operations buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onSettings}
                aria-label="Account Settings"
                className="flex h-7 w-7 items-center justify-center rounded text-cyber-text-muted hover:text-cyber-accent-cyan hover:bg-cyber-bg-accent transition-colors duration-200"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={onLogout}
                aria-label="Terminate Session"
                className="flex h-7 w-7 items-center justify-center rounded text-cyber-text-muted hover:text-threat-critical hover:bg-cyber-bg-accent transition-colors duration-200"
              >
                <LogOut size={14} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="tooltip-cyber-trigger relative flex items-center justify-center">
              {/* Profile Avatar Icon button */}
              <button
                aria-label="User profile details"
                className="relative flex h-8 w-8 items-center justify-center rounded border border-cyber-border-subtle bg-cyber-bg-deep text-xs font-mono font-bold text-cyber-text-base hover:border-cyber-accent-cyan/50 hover:text-cyber-accent-cyan transition-all duration-200"
              >
                {user.avatarInitials}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-threat-low ring-1 ring-cyber-bg-deep" />
              </button>

              {/* Collapsed Tooltip menu overlay */}
              <div className="tooltip-cyber-content left-full ml-4 translate-x-0 bottom-auto top-1/2 -translate-y-1/2 text-left z-50 min-w-[120px]">
                <div className="text-[10px] font-bold text-cyber-text-bright mb-0.5">{user.username}</div>
                <div className="text-[9px] text-cyber-text-muted font-mono mb-2">{user.clearance}</div>
                <div className="border-t border-cyber-border-subtle pt-1.5 flex items-center gap-2">
                  <button
                    onClick={onSettings}
                    className="flex items-center gap-1 font-mono text-[9px] text-cyber-text-base hover:text-cyber-accent-cyan"
                  >
                    <Settings size={10} /> Settings
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 font-mono text-[9px] text-threat-critical hover:text-threat-critical"
                  >
                    <LogOut size={10} /> Exit
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SidebarFooter;
