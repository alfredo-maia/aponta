import { HTMLAttributes, forwardRef, Ref, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from './utils';
import { EzTaskbar, EzTaskbarButton } from './EzTaskbar';
import { EzEntityGrid } from './EzEntityGrid';
import { EzEntityForm, EzEntityFormField } from './EzEntityForm';
import { EzSpinner } from './EzSpinner';

/** Operation mode: whether `EzSimpleCrud` owns the data in memory or delegates to the consumer's backend. */
export type EzSimpleCrudMode = 'SERVER' | 'IN_MEMORY';

export type EzSimpleCrudProps<T> = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Column definitions used by the grid view (same shape as `EzEntityGrid`). */
  columns: ColumnDef<T>[];
  /** Field schema used by the form view (same shape as `EzEntityForm`). */
  fields: EzEntityFormField[];
  /** Operation mode: `IN_MEMORY` manages `data` locally, `SERVER` delegates to `onFetch`/`onSave`/`onDelete`. */
  mode: EzSimpleCrudMode;
  /** Dataset rendered by the grid. Required (and owned by the caller) in `IN_MEMORY` mode. */
  data?: T[];
  /** Called with the full updated dataset whenever it changes, in `IN_MEMORY` mode. */
  onDataChange?: (data: T[]) => void;
  /** Fetches the initial dataset. Called once on mount, in `SERVER` mode. */
  onFetch?: () => Promise<T[]>;
  /** Persists a created/edited item and resolves with the saved record, in `SERVER` mode. */
  onSave?: (item: T) => Promise<T>;
  /** Deletes the item with the given id, in `SERVER` mode. */
  onDelete?: (id: string | number) => Promise<void>;
  /** Extracts a stable identifier from an item (used for selection/update/delete matching). */
  getId: (item: T) => string | number;
  /** Builds a blank item for the form opened by the taskbar's INSERT button. */
  createEmptyItem: () => T;
  /** Renders a CONFIGURATOR taskbar button that calls this handler when clicked. Omit to hide it. */
  onOpenConfigurator?: () => void;
  /** Number of rows per page in the grid view. Omit to render every row without pagination controls. */
  pageSize?: number;
};

type EzSimpleCrudComponent = <T,>(
  props: EzSimpleCrudProps<T> & { ref?: Ref<HTMLDivElement> }
) => React.ReactElement | null;

type ViewMode = 'GRID' | 'FORM';

function EzSimpleCrudInner<T>(
  {
    columns,
    fields,
    mode,
    data,
    onDataChange,
    onFetch,
    onSave,
    onDelete,
    getId,
    createEmptyItem,
    onOpenConfigurator,
    pageSize,
    className,
    ...props
  }: EzSimpleCrudProps<T>,
  ref: Ref<HTMLDivElement>
) {
  const [view, setView] = useState<ViewMode>('GRID');
  const [items, setItems] = useState<T[]>(data ?? []);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(mode === 'SERVER');

  useEffect(() => {
    if (mode === 'IN_MEMORY') {
      setItems(data ?? []);
    }
  }, [mode, data]);

  useEffect(() => {
    if (mode !== 'SERVER' || !onFetch) return;
    let isMounted = true;
    setIsLoading(true);
    onFetch().then((fetched) => {
      if (isMounted) {
        setItems(fetched);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleInsert = () => {
    setEditingItem(createEmptyItem());
    setView('FORM');
  };

  const handleSelectionChange = (rows: T[]) => {
    setSelectedRows(rows);
    const row = rows[0];
    if (!row) return;
    setEditingItem(row);
    setView('FORM');
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setEditingItem((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleCancel = () => {
    setEditingItem(null);
    setView('GRID');
  };

  const handleSave = async () => {
    if (!editingItem) return;

    if (mode === 'SERVER' && onSave) {
      setIsLoading(true);
      const saved = await onSave(editingItem);
      setItems((prev) => {
        const id = getId(saved);
        const exists = prev.some((item) => getId(item) === id);
        return exists ? prev.map((item) => (getId(item) === id ? saved : item)) : [...prev, saved];
      });
      setIsLoading(false);
    } else {
      const id = getId(editingItem);
      const exists = items.some((item) => getId(item) === id);
      const nextItems = exists
        ? items.map((item) => (getId(item) === id ? editingItem : item))
        : [...items, editingItem];
      setItems(nextItems);
      onDataChange?.(nextItems);
    }

    setEditingItem(null);
    setView('GRID');
  };

  const handleDelete = async (rows: T[]) => {
    if (rows.length === 0) return;
    const idsToRemove = new Set(rows.map(getId));

    if (mode === 'SERVER' && onDelete) {
      setIsLoading(true);
      await Promise.all(rows.map((row) => onDelete(getId(row))));
      setItems((prev) => prev.filter((item) => !idsToRemove.has(getId(item))));
      setIsLoading(false);
    } else {
      const nextItems = items.filter((item) => !idsToRemove.has(getId(item)));
      setItems(nextItems);
      onDataChange?.(nextItems);
    }
  };

  const taskbarButtons = useMemo<EzTaskbarButton[]>(() => {
    const buttons: EzTaskbarButton[] = ['INSERT', 'REMOVE'];
    if (onOpenConfigurator) {
      buttons.push('DIVIDER', 'CONFIGURATOR');
    }
    return buttons;
  }, [onOpenConfigurator]);

  const handleGridTaskbarAction = (action: string) => {
    if (action === 'INSERT') {
      handleInsert();
    } else if (action === 'REMOVE') {
      void handleDelete(selectedRows);
    } else if (action === 'CONFIGURATOR') {
      onOpenConfigurator?.();
    }
  };

  const formValues = (editingItem ?? {}) as Record<string, unknown>;

  return (
    <div ref={ref} className={cn('flex flex-col gap-3 w-full', className)} {...props}>
      {isLoading && view === 'GRID' && items.length === 0 ? (
        <EzSpinner label="Carregando..." />
      ) : view === 'GRID' ? (
        <EzEntityGrid
          columns={columns}
          data={items}
          selectable
          taskbarButtons={taskbarButtons}
          onTaskbarAction={handleGridTaskbarAction}
          onSelectionChange={handleSelectionChange}
          pageSize={pageSize}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <EzTaskbar buttons={['SAVE', 'CANCEL']} onAction={(action) => {
            if (action === 'SAVE') {
              void handleSave();
            } else if (action === 'CANCEL') {
              handleCancel();
            }
          }} primaryButton="SAVE" />
          <EzEntityForm fields={fields} values={formValues} onChange={handleFieldChange} />
        </div>
      )}
    </div>
  );
}

/**
 * Aponta DS Simple Crud (visual/UX behavior mirror of Sankhya DS `snk-simple-crud`).
 * Composes `EzEntityGrid`, `EzEntityForm` and `EzTaskbar` into a single
 * grid/form CRUD screen: a taskbar INSERT button (or clicking a grid row)
 * opens the form, and SAVE/CANCEL return to the grid. WITHOUT any coupling
 * to `SnkApplication` / `DataUnit` / `configName` / Dicionário de Dados —
 * runs either `IN_MEMORY` (data owned by the caller via `data`/
 * `onDataChange`) or `SERVER` (delegates to async `onFetch`/`onSave`/
 * `onDelete` callbacks, with a loading state while they resolve).
 */
export const EzSimpleCrud = forwardRef(EzSimpleCrudInner) as EzSimpleCrudComponent;
(EzSimpleCrud as unknown as { displayName?: string }).displayName = 'EzSimpleCrud';
