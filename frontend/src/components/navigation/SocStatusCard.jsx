/* SocStatusCard.jsx - Telemetry widget displaying system status & active SIEM health indices */
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, HardDrive, AlertTriangle } from 'lucide-react';

export function SocStatusCard({ isCollapsed }) {
  // Mock data representing live SOC telemetry
  const telemetry = {
    status: 'Operational',
    threatLevel: 'Low',
    threatIndex: '1.4',
    activeIncidents: 14,
    databaseSync: '99.98%',
    integrity: 'Secure'
  };

  return (
    <div className="px-2 py-2">
      <div className="relative overflow-hidden rounded border border-cyber-border-subtle bg-cyber-bg-deep p-3 transition-all duration-300 hover:border-cyber-accent-cyan/40">
        {/* Subtle cyan grid overlay behind card */}
        <div className="absolute inset-0 bg-cyber-dots opacity-20 pointer-events-none" />

        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Card Title Header */}
              <div className="flex items-center justify-between border-b border-cyber-border-muted pb-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-text-muted">
                  <Shield size={10} className="text-cyber-accent-cyan animate-pulse" />
                  SOC Operations
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold text-threat-low uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-threat-low animate-ping" />
                  {telemetry.status}
                </span>
              </div>

              {/* Threat Index Section */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded bg-cyber-bg-panel p-2 border border-cyber-border-muted">
                  <div className="font-mono text-[9px] text-cyber-text-muted uppercase">Threat Index</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-sm font-mono font-bold text-cyber-text-bright">
                      {telemetry.threatIndex}
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-threat-low uppercase">
                      {telemetry.threatLevel}
                    </span>
                  </div>
                </div>

                <div className="rounded bg-cyber-bg-panel p-2 border border-cyber-border-muted">
                  <div className="font-mono text-[9px] text-cyber-text-muted uppercase">Active Alerts</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-sm font-mono font-bold text-threat-critical">
                      {telemetry.activeIncidents}
                    </span>
                    <span className="text-[9px] font-mono text-cyber-text-muted uppercase">Inc</span>
                  </div>
                </div>
              </div>

              {/* Technical indicators */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-cyber-text-muted">
                    <Activity size={10} className="text-cyber-accent-blue" />
                    SIEM Load
                  </span>
                  <span className="text-cyber-text-base">14%</span>
                </div>
                <div className="w-full bg-cyber-bg-panel rounded-full h-1 overflow-hidden border border-cyber-border-muted">
                  <div className="bg-cyber-accent-cyan h-full rounded-full" style={{ width: '14%' }} />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-cyber-text-muted">
                    <HardDrive size={10} className="text-cyber-accent-indigo" />
                    Data Feed
                  </span>
                  <span className="text-cyber-text-base">{telemetry.databaseSync}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-2 py-1"
            >
              <div className="tooltip-cyber-trigger relative flex items-center justify-center">
                {/* Collapsed view status indicator button */}
                <div className="flex h-8 w-8 items-center justify-center rounded border border-cyber-border-subtle bg-cyber-bg-panel text-cyber-accent-cyan hover:border-cyber-accent-cyan/50 hover:bg-cyber-bg-accent">
                  <Shield size={16} className="animate-pulse" />
                </div>
                {/* Glowing status dot overlay */}
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-threat-low opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-threat-low"></span>
                </span>

                {/* Collapsed Tooltip Overlay */}
                <div className="tooltip-cyber-content left-full ml-4 translate-x-0 bottom-auto top-1/2 -translate-y-1/2 text-left font-mono z-50">
                  <div className="text-[10px] border-b border-cyber-border-subtle pb-1 mb-1 font-bold text-cyber-text-bright flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-threat-low inline-block" />
                    SOC OVERVIEW
                  </div>
                  <div className="space-y-0.5 text-[9px] text-cyber-text-base">
                    <div>Status: <span className="text-threat-low font-semibold">Active</span></div>
                    <div>Threat Index: <span className="text-cyber-text-bright">1.4</span></div>
                    <div>Alerts: <span className="text-threat-critical font-bold">14 Active</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SocStatusCard;
