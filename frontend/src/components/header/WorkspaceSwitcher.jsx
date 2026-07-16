/* WorkspaceSwitcher.jsx — Deployment selector widget for active SOC zones */
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Layers, AlertCircle } from 'lucide-react';
import { WORKSPACES } from '../../utils/headerConfig';

export function WorkspaceSwitcher({ isOpen, setIsOpen, activeWorkspace, onSelect }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'degraded': return 'bg-orange-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="relative">
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-all duration-150 ${
          isOpen
            ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400'
            : 'border-white/5 bg-white/2 text-slate-400 hover:text-slate-200 hover:border-white/10'
        }`}
      >
        <Layers size={12} className="text-cyan-400" />
        <div className="text-left">
          <p className="font-mono text-[9px] font-bold uppercase leading-none tracking-wide text-slate-300">
            {activeWorkspace.name}
          </p>
          <span className="font-mono text-[7px] text-slate-500 uppercase mt-0.5 block leading-none">
            {activeWorkspace.region}
          </span>
        </div>
        <ChevronDown size={11} className={`text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Switcher Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="absolute left-0 mt-2 w-56 rounded-xl border border-white/5 bg-[#0a0f1a]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-3.5 py-2.5 border-b border-white/5 bg-slate-950/20">
                <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-slate-500">
                  Select Deployment
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                {WORKSPACES.map((workspace) => {
                  const isCurrent = workspace.id === activeWorkspace.id;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => {
                        onSelect(workspace);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                        isCurrent
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-400 hover:bg-white/2 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-mono text-[10px] font-semibold">{workspace.name}</p>
                        <span className="font-mono text-[8px] text-slate-500 uppercase mt-0.5 block">
                          {workspace.region}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(workspace.status)}`} />
                        <span className="font-mono text-[8px] text-slate-500 uppercase">{workspace.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkspaceSwitcher;
