/* ProfileMenu.jsx — Quick access profile, status, and logout actions */
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks';
import { PATHS } from '@routes/paths';

export function ProfileMenu({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Analyst-42';
  const initials = displayName.charAt(0).toUpperCase() || 'A';

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate(PATHS.LOGIN, { replace: true });
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate(PATHS.SETTINGS);
  };

  const handleProfile = () => {
    setIsOpen(false);
    navigate(PATHS.PROFILE);
  };

  return (
    <div className="relative">
      {/* Profile Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-lg border p-1 pr-2.5 transition-all duration-150 ${
          isOpen ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 bg-white/2 hover:border-white/10'
        }`}
      >
        <div className="relative h-6.5 w-6.5 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
          {initials}
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-500 border border-slate-900" />
        </div>
        <span className="font-mono text-[10px] font-medium text-slate-300 hidden md:block">{displayName}</span>
        <ChevronDown size={10} className={`text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Profile Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="absolute right-0 mt-2 w-48 rounded-xl border border-white/5 bg-[#0a0f1a]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header profile details */}
              <div className="px-3.5 py-3 border-b border-white/5 bg-slate-950/20">
                <p className="font-mono text-[10px] font-bold text-slate-200">{displayName}</p>
                <span className="font-mono text-[7px] text-cyan-500 uppercase mt-0.5 block tracking-widest leading-none">
                  SOC clearance level 3
                </span>
              </div>

              {/* Actions list */}
              <div className="p-1 space-y-0.5">
                <button
                  onClick={handleProfile}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-[10px] text-slate-400 hover:bg-white/2 hover:text-slate-200 transition-colors"
                >
                  <User size={12} className="text-slate-600" /> Profile Details
                </button>
                <button
                  onClick={handleSettings}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-[10px] text-slate-400 hover:bg-white/2 hover:text-slate-200 transition-colors"
                >
                  <Settings size={12} className="text-slate-600" /> Settings
                </button>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut size={12} className="text-red-500/60" /> Logout Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileMenu;
