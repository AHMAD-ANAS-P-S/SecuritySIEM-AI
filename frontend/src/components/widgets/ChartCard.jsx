/**
 * ChartCard.jsx — SIEM Chart Container Card
 * Design System: Cyber/SIEM | Tailwind + Framer Motion
 *
 * Features:
 *   - Housing card wrapper for charts
 *   - Control toolbar: refresh/reload trigger, expand to full screen overlay
 *   - Responsive sizing and title details
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChartCard({
  title,
  subtitle,
  children,
  onReload,
  loading = false,
  className = '',
  height = 'h-auto',
}) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => setIsFullScreen((fs) => !fs);

  const toolbarControls = (
    <div className="flex items-center gap-1.5">
      {onReload && (
        <button
          type="button"
          disabled={loading}
          onClick={onReload}
          className="rounded p-1 text-cyber-text-muted hover:text-cyber-accent-cyan hover:bg-cyber-bg-accent transition-colors"
          aria-label="Reload chart data"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={toggleFullScreen}
        className="rounded p-1 text-cyber-text-muted hover:text-cyber-accent-cyan hover:bg-cyber-bg-accent transition-colors"
        aria-label={isFullScreen ? 'Minimize chart' : 'Maximize chart to full screen'}
      >
        {isFullScreen ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        )}
      </button>
    </div>
  );

  const cardContent = (
    <div className={`flex flex-col h-full ${isFullScreen ? 'p-6 bg-cyber-bg-panel' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-cyber-border-muted pb-3.5 mb-4">
        <div>
          {title && (
            <h4 className="text-sm font-semibold text-cyber-text-bright font-cyber">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-[10px] text-cyber-text-muted mt-0.5 font-mono">
              {subtitle}
            </p>
          )}
        </div>
        {toolbarControls}
      </div>

      {/* Chart workspace */}
      <div className={`relative flex-1 ${height}`}>
        {loading && (
          <div className="absolute inset-0 bg-cyber-bg-panel/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin text-cyber-accent-cyan">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isFullScreen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-cyber-bg-deep p-6"
          >
            {cardContent}
          </motion.div>
        ) : (
          <div className={`rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel p-5 ${className}`}>
            {cardContent}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChartCard;
