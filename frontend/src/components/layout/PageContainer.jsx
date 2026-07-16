/* PageContainer.jsx — Standardized responsive container for page padding */
import PropTypes from 'prop-types';

export function PageContainer({ children, className = '' }) {
  return (
    <div className={`p-4 lg:p-6 mx-auto w-full max-w-[1600px] space-y-6 ${className}`}>
      {children}
    </div>
  );
}

PageContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default PageContainer;
