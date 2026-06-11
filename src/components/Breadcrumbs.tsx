import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStreaming } from '../context/StreamingContext';

interface Crumb {
  label: string;
  path?: string; // undefined = current page (not clickable)
}

function buildCrumbs(pathname: string, shows: { id: string; title: string }[]): Crumb[] {
  const crumbs: Crumb[] = [];

  if (pathname === '/') return [];

  // Always start with Главная
  crumbs.push({ label: 'Главная', path: '/' });

  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'shows') {
    if (segments.length === 1) {
      crumbs.push({ label: 'Сериалы' });
    } else if (segments.length >= 2) {
      crumbs.push({ label: 'Сериалы', path: '/shows' });
      const show = shows.find(s => s.id === segments[1]);
      const showTitle = show?.title || 'Сериал';

      if (segments.length === 2) {
        crumbs.push({ label: showTitle });
      } else if (segments.length >= 4 && segments[2] === 'ep') {
        crumbs.push({ label: showTitle, path: `/shows/${segments[1]}` });
        crumbs.push({ label: `Серия` });
      }
    }
  } else if (segments[0] === 'news') {
    if (segments.length === 1) {
      crumbs.push({ label: 'Новости' });
    } else {
      crumbs.push({ label: 'Новости', path: '/news' });
      crumbs.push({ label: 'Статья' });
    }
  } else if (segments[0] === 'cowatch') {
    if (segments.length === 1) {
      crumbs.push({ label: 'Совместный просмотр' });
    } else {
      crumbs.push({ label: 'Совместный просмотр', path: '/cowatch' });
      crumbs.push({ label: `Комната ${segments[1]}` });
    }
  } else if (segments[0] === 'gallery') {
    crumbs.push({ label: 'Галерея' });
  } else if (segments[0] === 'minecraft') {
    if (segments.length === 1) {
      crumbs.push({ label: 'Minecraft' });
    } else if (segments[1] === 'mods') {
      crumbs.push({ label: 'Minecraft', path: '/minecraft' });
      crumbs.push({ label: 'Моды' });
    }
  } else if (segments[0] === 'bunker') {
    crumbs.push({ label: 'Бункер' });
  } else if (segments[0] === 'admin') {
    crumbs.push({ label: 'Админ-панель' });
  }

  return crumbs;
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shows } = useStreaming();

  const crumbs = buildCrumbs(location.pathname, shows);

  if (crumbs.length === 0) return null;

  return (
    <nav 
      className="px-6 md:px-10 pt-4 pb-0 max-w-7xl w-full mx-auto"
      aria-label="Хлебные крошки"
    >
      <ol className="flex items-center gap-1 text-xs text-text-muted flex-wrap">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="w-3 h-3 text-text-muted/50 shrink-0" aria-hidden="true" />
              )}
              {crumb.path && !isLast ? (
                <button
                  onClick={() => navigate(crumb.path!)}
                  className="hover:text-accent-color transition-colors cursor-pointer font-medium"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={`${isLast ? 'text-text-primary font-semibold' : ''} truncate max-w-[200px]`}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
