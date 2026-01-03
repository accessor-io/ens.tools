import { ReactNode } from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className = '' }: PageHeaderProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className={`mb-6 ${className}`}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb
            className="mb-4"
            items={[
              {
                label: 'Dashboard',
                onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
              },
              ...breadcrumbs.map((crumb) => ({
                label: crumb.label,
                // Breadcrumb component will render these as non-clickable
              })),
            ]}
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
            {description && (
              <p className="text-slate-600 text-base">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}










