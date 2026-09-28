'use client';

import React, { useEffect } from 'react';

/*
 * Page header. On phones it is the sticky top bar (title + subtitle + icon
 * actions); on desktop it becomes a large page title with labeled buttons.
 *
 *   <PageHeader title="Lista de la compra" subtitle="12 productos"
 *     actions={<HeaderButton icon={<Plus size={20} />} label="Añadir" variant="primary" showLabel onClick={…} />}>
 *     {optional compact content under the title, e.g. a progress bar}
 *   </PageHeader>
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__bar">
        <div className="page-header__titles">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        <div className="page-header__actions">{actions}</div>
      </div>
      {children && <div className="page-header__extra">{children}</div>}
    </header>
  );
}

export function HeaderButton({
  icon,
  label,
  onClick,
  variant = 'ghost',
  showLabel = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'primary' | 'secondary';
  /** Also show the text on phones (the label is always visible on desktop) */
  showLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`header-btn header-btn--${variant}${showLabel ? ' header-btn--labeled' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {icon}
      <span className="header-btn__label">{label}</span>
    </button>
  );
}

/**
 * Fixed action bar above the tab bar on phones (inline/sticky on desktop).
 * Moves toasts up while it is visible.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('has-bottom-bar');
    return () => root.classList.remove('has-bottom-bar');
  }, []);

  return (
    <>
      <div className="bottom-bar-spacer" aria-hidden="true" />
      <div className="bottom-bar">
        <div className="bottom-bar__inner">{children}</div>
      </div>
    </>
  );
}
