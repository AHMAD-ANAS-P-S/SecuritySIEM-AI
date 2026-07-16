/* SearchBar.jsx — Global query search bar with backdrop overlay modal */
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, Sparkles, Terminal, ShieldAlert } from 'lucide-react';

export function SearchBar({ isOpen, setIsOpen, query, setQuery, suggestions }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <>
      {/* Mini trigger button on header */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-8 items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/2 pl-3 pr-2 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/25 transition-all duration-150 w-44 md:w-56"
      >
        <div className="flex items-center gap-2">
          <Search size={12} />
          <span className="font-mono text-[9px] tracking-wider text-left">Search console...</span>
        </div>
        <kbd className="font-mono text-[8px] bg-slate-950 border border-white/10 px-1 py-0.5 rounded leading-none text-slate-500">
          Ctrl+/
        </kbd>
      </button>

      {/* Full screen modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            {/* Backdrop click listener */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClear}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-xl rounded-xl border border-cyan-500/20 bg-[#0a0f1a] shadow-[0_0_30px_rgba(0,245,255,0.1)] overflow-hidden z-10"
            >
              {/* Header input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search size={16} className="text-cyan-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command, query, or search parameter..."
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none font-mono"
                />
                <button
                  onClick={handleClear}
                  className="font-mono text-[9px] text-slate-500 hover:text-red-400 border border-white/5 px-2 py-1 rounded transition-colors"
                >
                  ESC
                </button>
              </div>

              {/* Suggestions */}
              <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-hidden space-y-1">
                {suggestions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-xs text-slate-600">No telemetry results found</p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 flex items-center gap-1">
                      <Terminal size={10} className="text-slate-600" />
                      <span className="font-mono text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                        Command Suggestions
                      </span>
                    </div>
                    {suggestions.map((cmd) => (
                      <button
                        key={cmd.id}
                        onClick={handleClear}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-cyan-500/5 group transition-colors border border-transparent hover:border-cyan-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-cyan-400">
                            {cmd.category === 'Commands' ? <Terminal size={11} /> : <ShieldAlert size={11} />}
                          </div>
                          <div>
                            <p className="font-mono text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
                              {cmd.title}
                            </p>
                            <p className="font-mono text-[8px] text-slate-600 uppercase mt-0.5">{cmd.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <kbd className="font-mono text-[8px] bg-slate-950 border border-white/10 px-1.5 py-0.5 rounded text-slate-500">
                            {cmd.shortcut}
                          </kbd>
                          <CornerDownLeft size={10} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer status info */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-t border-white/5">
                <span className="font-mono text-[8px] text-slate-600 flex items-center gap-1">
                  <Sparkles size={10} className="text-cyan-400" /> Powered by SIEM AI Threat Intelligence Engine
                </span>
                <span className="font-mono text-[8px] text-slate-700">Ctrl+Space to toggle anytime</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SearchBar;
