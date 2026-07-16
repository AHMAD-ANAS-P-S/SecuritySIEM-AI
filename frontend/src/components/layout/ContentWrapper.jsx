/* ContentWrapper.jsx — Layout block to standardize inner content layouts (grid, columns, flex) */
import PropTypes from 'prop-types';

export function ContentWrapper({ children, cols = 1, gap = 4, className = '' }) {
  const getGridCols = (c) => {
    switch (c) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 lg:grid-cols-3';
      case 4: return 'grid-cols-2 xl:grid-cols-4';
      case 5: return 'grid-cols-1 lg:grid-cols-5';
      default: return 'grid-cols-1';
    }
  };

  const getGridGap = (g) => {
    switch (g) {
      case 2: return 'gap-2';
      case 3: return 'gap-3';
      case 4: return 'gap-4';
      case 5: return 'gap-5';
      default: return 'gap-4';
    }
  };

  return (
    <div className={`grid ${getGridCols(cols)} ${getGridGap(gap)} ${className}`}>
      {children}
    </div>
  );
}

ContentWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  cols: PropTypes.oneOf([1, 2, 3, 4, 5]),
  gap: PropTypes.oneOf([2, 3, 4, 5]),
  className: PropTypes.string,
};

export default ContentWrapper;
