/* Button.jsx — Reusable interactive button component with cyber variants and animations */
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'btn-cyber-primary';
      case 'danger':
        return 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]';
      case 'outline':
        return 'bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 hover:border-white/20';
      case 'ghost':
        return 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent';
      default:
        return 'btn-cyber-primary';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1.5 text-[9px] rounded';
      case 'md':
        return 'px-4 py-2 text-[10px] rounded-lg';
      case 'lg':
        return 'px-5 py-2.5 text-[11px] rounded-lg';
      default:
        return 'px-4 py-2 text-[10px] rounded-lg';
    }
  };

  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center gap-2 font-mono font-semibold uppercase tracking-wider
        transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${disabled || loading ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'danger', 'outline', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default Button;
