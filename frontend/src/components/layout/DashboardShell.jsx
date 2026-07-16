/* DashboardShell.jsx — Inner layout wrapper to coordinate sizing and scroll offsets */
import PropTypes from 'prop-types';

export function DashboardShell({ children, className = '' }) {
  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

DashboardShell.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default DashboardShell;
