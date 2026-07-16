/* Breadcrumbs.jsx — Navigation path indicator */
import { Fragment } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Terminal } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'DASHBOARD',
  alerts: 'ALERTS & INCIDENTS',
  hunting: 'THREAT HUNTING',
  logs: 'LOG EXPLORER',
  soar: 'SOAR PLAYBOOKS',
  settings: 'SETTINGS',
  profile: 'ANALYST PROFILE',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 select-none">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Terminal size={12} className="text-cyan-400/80" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">SOC</span>
      </div>

      <ChevronRight size={10} className="text-slate-700" />

      <div className="flex items-center gap-1.5">
        <Link
          to="/"
          className="font-mono text-[9px] font-semibold text-slate-500 hover:text-cyan-400 transition-colors duration-150"
        >
          CORE
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const label = ROUTE_LABELS[value] || value.toUpperCase();

          return (
            <Fragment key={to}>
              <ChevronRight size={10} className="text-slate-700" />
              {last ? (
                <span className="font-mono text-[9px] font-bold text-cyan-400 tracking-wider">
                  {label}
                </span>
              ) : (
                <Link
                  to={to}
                  className="font-mono text-[9px] font-semibold text-slate-500 hover:text-cyan-400 transition-colors duration-150"
                >
                  {label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}

export default Breadcrumbs;
