/* ThemeToggle.jsx — Animated sun/moon theme switcher */
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@hooks';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`
        relative flex h-8 w-[52px] items-center rounded-full border p-0.5
        transition-all duration-300 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-offset-1
        ${isDark
          ? 'border-cyan-500/30 bg-cyan-500/10 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-slate-950'
          : 'border-sky-400/40 bg-sky-100 focus-visible:ring-sky-400/50 focus-visible:ring-offset-white'
        }
      `}
    >
      {/* Track bg glow */}
      {isDark && (
        <span className="absolute inset-0 rounded-full opacity-20"
          style={{ background: 'linear-gradient(90deg, rgba(0,229,255,0.3), transparent)' }} />
      )}

      {/* Sliding thumb */}
      <span
        className={`
          relative z-10 flex h-6 w-6 items-center justify-center rounded-full
          shadow-md transition-all duration-300
          ${isDark
            ? 'translate-x-[20px] bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,229,255,0.6)]'
            : 'translate-x-0 bg-white text-amber-500 shadow-[0_1px_6px_rgba(0,0,0,0.15)]'
          }
        `}
      >
        {isDark
          ? <Moon size={12} strokeWidth={2.5} />
          : <Sun size={12} strokeWidth={2.5} />
        }
      </span>
    </button>
  );
}

export default ThemeToggle;
