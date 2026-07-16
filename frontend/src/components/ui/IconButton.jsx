/* IconButton.jsx — Interactive square icon button with custom variants */
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export function IconButton({
  icon,
  onClick,
  type = 'button',
  variant = 'outline',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  title,
  'aria-label': ariaLabel,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(0,245,255,0.25)]';
      case 'outline':
        return 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:border-white/10';
      case 'danger':
        return 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)]';
      case 'ghost':
        return 'border border-transparent bg-transparent text-slate-500 hover:text-slate-300';
      default:
        return 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-7 w-7 rounded';
      case 'md':
        // h-8.5 is invalid in Tailwind — use h-[34px] w-[34px] instead
        return 'h-[34px] w-[34px] rounded-lg';
      case 'lg':
        return 'h-10 w-10 rounded-lg';
      default:
        return 'h-[34px] w-[34px] rounded-lg';
    }
  };

  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.95 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel || title}
      className={`
        inline-flex items-center justify-center flex-shrink-0 transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-cyan-500/50
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${disabled || loading ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        icon
      )}
    </motion.button>
  );
}

IconButton.propTypes = {
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit']),
  variant: PropTypes.oneOf(['primary', 'outline', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  title: PropTypes.string,
  'aria-label': PropTypes.string,
};

export default IconButton;
