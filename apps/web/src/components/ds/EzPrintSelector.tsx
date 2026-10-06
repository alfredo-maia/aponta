import { forwardRef, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { cn } from './utils';
import { EzModal } from './EzModal';
import { EzRadioButton } from './EzRadioButton';
import { EzCheck } from './EzCheck';
import { EzButton } from './EzButton';

/**
 * A single printer / print-model option offered to the user.
 */
export type EzPrintSelectorOption = {
  /** Unique identifier of the option, echoed back via `onPrint`. */
  id: string;
  /** Human readable label shown next to the radio item. */
  label: string;
};

export type EzPrintSelectorProps = {
  /** Controls whether the modal is rendered/visible. */
  isOpen: boolean;
  /** List of selectable printers / print-model options. */
  options: EzPrintSelectorOption[];
  /**
   * Called when the user confirms the print action.
   * @param optionId id of the selected option
   * @param remember whether "Usar sempre esta seleção" was checked
   */
  onPrint: (optionId: string, remember: boolean) => void;
  /** Called when the user cancels the selection (Cancelar button). */
  onCancel?: () => void;
  /** Modal title. @default 'Selecionar impressora' */
  title?: string;
  /** Extra classes applied to the modal's dialog element. */
  className?: string;
};

/**
 * Aponta DS Print Selector
 * Modal for choosing which printer/print-model a pending print job should
 * use, with an optional "always use this selection" preference. Mirrors the
 * visual behavior of Sankhya DS `snk-print-selector`, but is fully generic:
 * it has no dependency on `SnkApplication`/`DataUnit`/print server — the
 * caller owns `options` and the real print action via `onPrint`.
 */
export const EzPrintSelector = forwardRef<HTMLDivElement, EzPrintSelectorProps>(
  ({ isOpen, options, onPrint, onCancel, title = 'Selecionar impressora', className }, ref) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(options[0]?.id);
    const [remember, setRemember] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setSelectedId(options[0]?.id);
        setRemember(false);
      }
      // Only reset selection/remember when the modal transitions to open,
      // or the available options change while it's open.
    }, [isOpen, options]);

    const handlePrint = () => {
      if (!selectedId) return;
      onPrint(selectedId, remember);
    };

    const handleCancel = () => {
      onCancel?.();
    };

    return (
      <EzModal
        ref={ref}
        isOpen={isOpen}
        onClose={handleCancel}
        title={title}
        maxWidth="sm"
        className={className}
        footer={
          <>
            <EzButton variant="secondary" label="Cancelar" onClick={handleCancel} />
            <EzButton
              variant="primary"
              label="Imprimir"
              leftIcon={Printer}
              disabled={!selectedId}
              onClick={handlePrint}
            />
          </>
        }
      >
        <div className={cn('flex flex-col gap-4')}>
          <div role="radiogroup" aria-label={title} className="flex flex-col gap-3">
            {options.map((option) => (
              <EzRadioButton
                key={option.id}
                name="ez-print-selector-option"
                label={option.label}
                checked={selectedId === option.id}
                onChange={() => setSelectedId(option.id)}
              />
            ))}
          </div>

          <EzCheck
            label="Usar sempre esta seleção"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="pt-2 border-t border-gray-100"
          />
        </div>
      </EzModal>
    );
  }
);

EzPrintSelector.displayName = 'EzPrintSelector';
