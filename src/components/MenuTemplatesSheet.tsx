'use client';

import React, { useRef, useState } from 'react';
import { BookMarked, Trash2 } from 'lucide-react';
import Sheet, { useSheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/controls';
import { useApp } from '@/context/AppContext';
import { pluralize } from '@/lib/format';
import type { Dish, SavedMenuTemplate } from '@/types';
import styles from './MenuPlannerView.module.css';

/*
 * "Plantillas": save the current week with a name and load it again later.
 * Loading/saving runs once the sheet has closed, so the confirmation toast
 * (with "Deshacer") shows up in its normal place above the tab bar.
 */

interface MenuTemplatesSheetProps {
  open: boolean;
  onClose: () => void;
  /** Focus the name field when opening (from "Guardar semana como plantilla") */
  autoFocusName?: boolean;
}

type PendingAction = { kind: 'load'; templateId: string } | { kind: 'save'; name: string };

export default function MenuTemplatesSheet({ open, onClose, autoFocusName = false }: MenuTemplatesSheetProps) {
  // Mounted only while open: the name field starts empty every time
  if (!open) return null;
  return <TemplatesSheet onClose={onClose} autoFocusName={autoFocusName} />;
}

function TemplatesSheet({ onClose, autoFocusName }: { onClose: () => void; autoFocusName: boolean }) {
  const { loadSavedMenuTemplate, saveCurrentWeekAsTemplate } = useApp();
  const pending = useRef<PendingAction | null>(null);

  const handleClosed = () => {
    const action = pending.current;
    pending.current = null;
    onClose();
    if (action?.kind === 'load') loadSavedMenuTemplate(action.templateId);
    if (action?.kind === 'save') saveCurrentWeekAsTemplate(action.name);
  };

  return (
    <Sheet open onClose={handleClosed} title="Plantillas" subtitle="Guarda semanas y repítelas cuando quieras" width="sm">
      <TemplatesContent
        autoFocusName={autoFocusName}
        onAction={(action) => {
          pending.current = action;
        }}
      />
    </Sheet>
  );
}

function TemplatesContent({ autoFocusName, onAction }: { autoFocusName: boolean; onAction: (action: PendingAction) => void }) {
  const { close } = useSheet();
  const { savedMenus, deleteSavedMenuTemplate, plannedMealsCount, weekMenu, getDishById } = useApp();
  const [name, setName] = useState('');

  const trimmed = name.trim();
  const weekIsEmpty = plannedMealsCount === 0;
  const canSave = trimmed.length > 0 && !weekIsEmpty;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onAction({ kind: 'save', name: trimmed });
    close(true);
  };

  return (
    <>
      <form className={styles.templateForm} onSubmit={handleSubmit}>
        <h3 className="section-title">
          <label htmlFor="template-name">Guardar esta semana</label>
        </h3>
        <div className="input-row">
          <input
            id="template-name"
            className="input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej.: Semana ligera"
            maxLength={60}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="done"
            data-autofocus={autoFocusName ? true : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            Guardar
          </button>
        </div>
        <p className="field-hint">
          {weekIsEmpty
            ? 'Tu semana está vacía: planifica alguna comida para poder guardarla.'
            : `${plannedMealsCount === 1 ? 'Se guardará' : 'Se guardarán'} ${pluralize(plannedMealsCount, 'comida', 'comidas')} de ${weekMenu.activeDaysCount} días.`}
        </p>
      </form>

      <h3 className="section-title">
        Plantillas guardadas
        {savedMenus.length > 0 && <span className="section-title__aside">{savedMenus.length}</span>}
      </h3>

      {savedMenus.length === 0 ? (
        <EmptyState compact icon={<BookMarked size={26} />} title="Aún no tienes plantillas">
          Guarda una semana que te guste y cárgala otra vez con un toque.
        </EmptyState>
      ) : (
        <div className="list">
          {savedMenus.map((template) => (
            <div key={template.id} className={`list-row ${styles.templateRow}`}>
              <div className="list-row__main">
                <div className="list-row__title ellipsis">{template.name}</div>
                <div className="list-row__meta">{templateSummary(template)}</div>
                <TemplatePreview template={template} getDishById={getDishById} />
              </div>
              <button
                type="button"
                className={`btn btn-secondary btn-sm ${styles.templateLoad}`}
                onClick={() => {
                  onAction({ kind: 'load', templateId: template.id });
                  close(true);
                }}
                aria-label={`Cargar la plantilla «${template.name}»`}
              >
                Cargar
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--muted"
                onClick={() => deleteSavedMenuTemplate(template.id)}
                aria-label={`Borrar la plantilla «${template.name}»`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function templateMealsCount(template: SavedMenuTemplate): number {
  return template.days
    .slice(0, template.activeDaysCount)
    .reduce(
      (acc, day) =>
        acc + (day.comidaDishId || day.comidaCustomName ? 1 : 0) + (day.cenaDishId || day.cenaCustomName ? 1 : 0),
      0,
    );
}

/** "8 comidas · 6 días" */
function templateSummary(template: SavedMenuTemplate): string {
  return `${pluralize(templateMealsCount(template), 'comida', 'comidas')} · ${template.activeDaysCount === 7 ? 7 : 6} días`;
}

/** First dish names of the template: "Lentejas, Pasta boloñesa, Salmón…" */
function TemplatePreview({
  template,
  getDishById,
}: {
  template: SavedMenuTemplate;
  getDishById: (id: string | null | undefined) => Dish | undefined;
}) {
  const names: string[] = [];
  for (const day of template.days.slice(0, template.activeDaysCount)) {
    for (const id of [day.comidaDishId, day.cenaDishId]) {
      const dish = getDishById(id);
      if (dish && !names.includes(dish.name)) names.push(dish.name);
    }
  }
  if (names.length === 0) return null;
  const shown = names.slice(0, 3).join(', ');
  return <div className={`list-row__meta ellipsis ${styles.templatePreview}`}>{names.length > 3 ? `${shown}…` : shown}</div>;
}
