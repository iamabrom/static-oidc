import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  path: string;
  baseRoute: string; // '/' for public, '/_admin' for admin
}

export function Breadcrumb({ path, baseRoute }: BreadcrumbProps) {
  const parts = path.split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', to: baseRoute },
    ...parts.map((part, i) => ({
      label: decodeURIComponent(part),
      to: `${baseRoute}/${parts.slice(0, i + 1).join('/')}`,
    })),
  ];

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
      {crumbs.map((crumb, i) => (
        <span key={crumb.to} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {i > 0 && <ChevronRight size={12} />}
          {i === crumbs.length - 1 ? (
            <span style={{ color: 'var(--text-primary)' }}>{crumb.label}</span>
          ) : (
            <Link to={crumb.to} style={{ color: 'var(--text-secondary)' }}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
