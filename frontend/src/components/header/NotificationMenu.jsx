/* NotificationMenu.jsx — Dropdown menu for threat intelligence notifications */
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react';

const SEVERITY_ICONS = {
  critical: <ShieldAlert size={12} className="text-red-400" />,
  high: <AlertTriangle size={12} className="text-orange-400" />,
  medium: <AlertTriangle size={12} className="text-yellow-400" />,
  low: <ShieldAlert size={12} className="text-green-400" />,
};

export function NotificationMenu({ isOpen, setIsOpen, alerts, unreadCount, onMarkAllRead, onClearAlert }) {
  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg border text-slate-500 hover:text-cyan-400 transition-all duration-150 ${
          isOpen ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400' : 'border-white/5 bg-white/2'
        }`}
      >
        <Bell size={13} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="absolute right-0 mt-2 w-80 rounded-xl border border-white/5 bg-[#0a0f1a]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/20">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Threat Ticker
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 font-mono text-[8px] text-cyan-400 hover:text-cyan-300 uppercase transition-colors"
                  >
                    <Check size={9} /> Mark Read
                  </button>
                )}
              </div>

              {/* Alerts List */}
              <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5 scrollbar-hidden">
                {alerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-xs text-slate-600">No active incidents</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex gap-3 px-4 py-3.5 hover:bg-white/2 transition-colors relative group ${
                        !alert.read ? 'bg-cyan-500/[0.01]' : ''
                      }`}
                    >
                      {/* Read status pulse dot */}
                      {!alert.read && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,245,255,0.8)]" />
                      )}

                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {SEVERITY_ICONS[alert.severity] || <ShieldAlert size={12} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-[10px] leading-relaxed truncate ${
                          !alert.read ? 'text-slate-200 font-semibold' : 'text-slate-400'
                        }`}>
                          {alert.title}
                        </p>
                        <span className="font-mono text-[8px] text-slate-600 mt-1 block">{alert.time}</span>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={() => onClearAlert(alert.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-700 hover:text-red-400 hover:bg-white/5 transition-all"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationMenu;
