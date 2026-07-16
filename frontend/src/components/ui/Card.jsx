/* Card.jsx — Themed block card component using design system CSS variables */
import PropTypes from 'prop-types';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  bordered = true,
  ...props
}) {
  return (
    <div
      className={`
        rounded-xl p-5 transition-all duration-300
        ${bordered ? 'border border-cyber-border-subtle' : ''}
        ${hoverEffect ? 'hover:border-cyber-border-glow hover:shadow-[0_0_20px_rgba(0,229,255,0.06)] cursor-pointer' : ''}
        ${className}
      `}
      style={{ background: 'var(--cyber-bg-panel)' }}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hoverEffect: PropTypes.bool,
  bordered: PropTypes.bool,
};

export default Card;
