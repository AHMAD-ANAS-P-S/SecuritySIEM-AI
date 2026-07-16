/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html,css}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Brand (legacy pages support) ───────────── */
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          light: '#ffffff',
          dark: '#0b0f19',
        },
        /* ── Cyber Theme (Nested structure) ────────── */
        cyber: {
          bg: {
            deep: 'var(--cyber-bg-deep)',       // #030712 - main background
            panel: 'var(--cyber-bg-panel)',     // #080b11 - dashboard card/panel
            accent: 'var(--cyber-bg-accent)',   // #0e131f - secondary card or hover item
            input: 'var(--cyber-bg-input)',     // #05080f - code/input fields
            overlay: 'var(--cyber-bg-overlay)', // translucent backdrop
          },
          border: {
            subtle: 'var(--cyber-border-subtle)', // #1e293b - default boundaries
            glow: 'var(--cyber-border-glow)',     // rgba(0, 240, 255, 0.3) - active cyan borders
            muted: 'var(--cyber-border-muted)',   // #0f172a - dark boundary lines
            accent: 'var(--cyber-border-accent)',
          },
          text: {
            bright: 'var(--cyber-text-bright)', // #f8fafc - main headers
            base: 'var(--cyber-text-base)',     // #cbd5e1 - standard readability text
            muted: 'var(--cyber-text-muted)',   // #64748b - inactive tabs, secondary text
            dim: 'var(--cyber-text-dim)',
          },
          accent: {
            cyan: 'var(--cyber-accent-cyan)',     // #00f0ff - neon cyan primary
            blue: 'var(--cyber-accent-blue)',     // #38bdf8 - neon sky blue secondary
            violet: 'var(--cyber-accent-violet)',
            indigo: 'var(--cyber-accent-indigo)', // #6366f1 - deep cyber blue-purple
            green: 'var(--cyber-accent-green)',
            amber: 'var(--cyber-accent-amber)',
          }
        },
        /* ── Threat Severity ────────────────────────── */
        threat: {
          critical: {
            DEFAULT: 'var(--threat-critical)',      // #ff2e54 - glowing bright red
            glow: 'var(--threat-critical-glow)',    // rgba(255, 46, 84, 0.15)
            border: 'var(--threat-critical-border)' // rgba(255, 46, 84, 0.4)
          },
          high: {
            DEFAULT: 'var(--threat-high)',          // #f97316 - neon orange
            glow: 'var(--threat-high-glow)',        // rgba(249, 115, 22, 0.15)
            border: 'var(--threat-high-border)'     // rgba(249, 115, 22, 0.4)
          },
          medium: {
            DEFAULT: 'var(--threat-medium)',        // #eab308 - amber yellow
            glow: 'var(--threat-medium-glow)',      // rgba(234, 179, 8, 0.15)
            border: 'var(--threat-medium-border)'   // rgba(234, 179, 8, 0.4)
          },
          low: {
            DEFAULT: 'var(--threat-low)',           // #10b981 - bright green
            glow: 'var(--threat-low-glow)',         // rgba(16, 185, 129, 0.15)
            border: 'var(--threat-low-border)'      // rgba(16, 185, 129, 0.4)
          },
          info: {
            DEFAULT: 'var(--threat-info)',          // #06b6d4 - calm cyan/blue
            glow: 'var(--threat-info-glow)',        // rgba(6, 182, 212, 0.15)
            border: 'var(--threat-info-border)'     // rgba(6, 182, 212, 0.4)
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headings: ['Rajdhani', 'sans-serif'],
        cyber: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace']
      },
      fontSize: {
        'page-title': '2.625rem',   // 42px
        'section-title': '1.875rem', // 30px
        'card-title': '1.375rem',    // 22px
        'subtitle': '1.125rem',      // 18px
        'body-size': '1rem',         // 16px
        'caption-size': '0.875rem',  // 14px
        'small-size': '0.8125rem',   // 13px
      },
      boxShadow: {
        /* ── Legacy Support ─────────────────────────── */
        card:       '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        elevated:   '0 10px 30px -10px rgba(0, 0, 0, 0.2)',
        'cyber-sm': '0 0 8px var(--cyber-accent-cyan-glow)',
        'cyber-md': '0 0 16px var(--cyber-accent-cyan-glow)',
        'cyber-lg': '0 0 32px var(--cyber-accent-cyan-glow)',
        'threat-critical': '0 0 12px var(--threat-critical-glow)',
        'threat-high':     '0 0 12px var(--threat-high-glow)',
        /* ── Cyber Neon Highlights ──────────────────── */
        'cyan-neon': '0 0 10px var(--cyber-accent-cyan-glow)',
        'blue-neon': '0 0 10px var(--cyber-accent-blue-glow)',
        'critical-neon': '0 0 15px var(--threat-critical-glow)',
        'high-neon': '0 0 15px var(--threat-high-glow)',
        'medium-neon': '0 0 15px var(--threat-medium-glow)',
        'low-neon': '0 0 15px var(--threat-low-glow)',
        'info-neon': '0 0 15px var(--threat-info-glow)',
        'inset-cyber': 'inset 0 0 12px var(--cyber-border-glow)',
        'inset-critical': 'inset 0 0 12px var(--threat-critical-border)'
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      backgroundImage: {
        /* ── Legacy Support ─────────────────────────── */
        'cyber-grid': 'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
        'cyber-gradient': 'linear-gradient(135deg, var(--cyber-bg-deep) 0%, var(--cyber-bg-panel) 100%)',
        /* ── Cyber Scanlines & Grids ────────────────── */
        'cyber-grid-pattern': 'linear-gradient(to right, rgba(0, 240, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.04) 1px, transparent 1px)',
        'cyber-scanlines': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        'cyber-grad-vertical': 'linear-gradient(180deg, var(--cyber-bg-panel) 0%, var(--cyber-bg-deep) 100%)',
        'cyber-panel-glow': 'linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%)'
      },
      backgroundSize: {
        'cyber-grid': '32px 32px',
      },
      keyframes: {
        /* ── Legacy Support ─────────────────────────── */
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px var(--cyber-accent-cyan-glow)' },
          '50%':       { boxShadow: '0 0 20px var(--cyber-accent-cyan-glow), 0 0 40px var(--cyber-accent-cyan-glow)' },
        },
        radarSweep: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%':      { transform: 'translate(-2px, 2px)' },
          '40%':      { transform: 'translate(-2px, -2px)' },
          '60%':      { transform: 'translate(2px, 2px)' },
          '80%':      { transform: 'translate(2px, -2px)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        threatPulse: {
          '0%, 100%': { boxShadow: '0 0 6px var(--threat-critical-glow)' },
          '50%':       { boxShadow: '0 0 18px var(--threat-critical-glow), 0 0 32px var(--threat-critical-glow)' },
        },
        /* ── Cyber Animations ───────────────────────── */
        cyberPulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px var(--cyber-accent-cyan-glow)' },
          '50%': { opacity: '0.4', boxShadow: '0 0 2px rgba(0, 240, 255, 0.1)' }
        },
        scanlineScroll: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        terminalBlink: {
          '50%': { borderColor: 'transparent' }
        },
        skeletonShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        modalFadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        modalScaleIn: {
          'from': { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          'to': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' }
        },
        tooltipShow: {
          'from': { opacity: '0', transform: 'scale(0.95) translateY(4px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        cyberGlitch: {
          '0%': { clipPath: 'inset(40% 0 61% 0)', transform: 'skew(0.3deg)' },
          '20%': { clipPath: 'inset(92% 0 1% 0)', transform: 'skew(-0.2deg)' },
          '40%': { clipPath: 'inset(15% 0 80% 0)', transform: 'skew(0.1deg)' },
          '60%': { clipPath: 'inset(80% 0 5% 0)', transform: 'skew(-0.4deg)' },
          '80%': { clipPath: 'inset(3% 0 92% 0)', transform: 'skew(0.3deg)' },
          '100%': { clipPath: 'inset(60% 0 30% 0)', transform: 'skew(0deg)' }
        }
      },
      animation: {
        /* ── Legacy Support ─────────────────────────── */
        fadeIn:       'fadeIn 0.2s ease-in-out',
        slideInLeft:  'slideInLeft 0.35s ease-out',
        slideInUp:    'slideInUp 0.4s ease-out',
        pulseGlow:    'pulseGlow 2s ease-in-out infinite',
        radarSweep:   'radarSweep 4s linear infinite',
        scanLine:     'scanLine 8s linear infinite',
        glitch:       'glitch 0.5s ease-in-out',
        countUp:      'countUp 0.6s ease-out forwards',
        shimmer:      'shimmer 1.8s linear infinite',
        blink:        'blink 1s step-end infinite',
        threatPulse:  'threatPulse 1.5s ease-in-out infinite',
        /* ── Cyber Animations ───────────────────────── */
        'cyber-pulse': 'cyberPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline-scroll': 'scanlineScroll 12s linear infinite',
        'terminal-blink': 'terminalBlink 1.2s step-end infinite',
        'skeleton-shimmer': 'skeletonShimmer 2s infinite linear',
        'modal-fade-in': 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-scale-in': 'modalScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'tooltip-show': 'tooltipShow 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'cyber-glitch': 'cyberGlitch 1.5s infinite linear alternate-reverse'
      },
    },
  },
  plugins: [],
};

