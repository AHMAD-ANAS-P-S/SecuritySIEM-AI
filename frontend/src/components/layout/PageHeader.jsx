/* PageHeader.jsx — Dynamic page header component with title, subtitle, status tag, and action slots */
import PropTypes from 'prop-types';

export function PageHeader({ title, description, statusLabel, statusColor = 'cyan', actions }) {
  const getStatusDotColor = (color) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      case 'cyan': return 'bg-cyan-400';
      default: return 'bg-slate-400';
    }
  };

  const getStatusTextColor = (color) => {
    switch (color) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'green': return 'text-green-400';
      case 'cyan': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        {statusLabel && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusDotColor(statusColor)}`} />
            <span className={`font-mono text-[9px] uppercase tracking-widest ${getStatusTextColor(statusColor)}`}>
              {statusLabel}
            </span>
          </div>
        )}
        {/* Use CSS variable for theme-aware heading color instead of hardcoded text-white */}
        <h1
          className="text-xl font-bold tracking-wide"
          style={{ color: 'var(--cyber-text-bright)' }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="font-mono text-[10px] mt-0.5"
            style={{ color: 'var(--cyber-text-muted)' }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  statusLabel: PropTypes.string,
  statusColor: PropTypes.oneOf(['red', 'orange', 'green', 'cyan', 'slate']),
  actions: PropTypes.node,
};

export default PageHeader;
