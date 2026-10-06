import { forwardRef, useState } from 'react';
import { cn } from './utils';
import { EzModal } from './EzModal';
import { EzButton } from './EzButton';
import { EzSpinner } from './EzSpinner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/** A scope option describing which records should be exported. */
export type EzDataExporterScope = {
  /** Machine-readable value passed to `onExport`, e.g. 'selected' | 'page' | 'all'. */
  value: string;
  /** Human readable label rendered next to the radio option. */
  label: string;
};

/** Current async lifecycle of the export action. */
type EzDataExporterStatus = 'idle' | 'loading' | 'success' | 'error';

const FORMAT_LABELS: Record<string, string> = {
  csv: 'CSV',
  xlsx: 'XLSX',
  excel: 'Excel',
  pdf: 'PDF',
};

function formatLabel(format: string): string {
  return FORMAT_LABELS[format.toLowerCase()] ?? format.toUpperCase();
}

export type EzDataExporterProps = {
  /** Controls whether the export modal is visible. */
  isOpen: boolean;
  /** Called when the modal should be dismissed (close button, backdrop, Escape). */
  onClose: () => void;
  /**
   * List of export formats offered to the user, e.g. ['csv', 'xlsx', 'pdf'].
   * @default ['csv', 'xlsx', 'pdf']
   */
  formats?: string[];
  /**
   * List of export scopes offered to the user (selected rows / current page / all records).
   * @default [{ value: 'selected', label: 'Selecionados' }, { value: 'page', label: 'Página atual' }, { value: 'all', label: 'Todos os registros' }]
   */
  scopes?: EzDataExporterScope[];
  /** Number of currently selected records, shown next to the "selected" scope when provided. */
  selectedCount?: number;
  /** Total number of records available, shown next to the "all" scope when provided. */
  totalCount?: number;
  /**
   * Called when the user confirms the export, with the chosen format and scope values.
   * May return a Promise; while pending, a loading state is shown.
   */
  onExport: (format: string, scope: string) => void | Promise<void>;
};

/**
 * Aponta DS Data Exporter
 * Modal that lets the user choose an export format and scope (selected rows,
 * current page or all records) and confirm, delegating the actual export work
 * to the `onExport` callback. Mirrors the Sankhya DS `snk-data-exporter`
 * UX contract, without any dependency on SnkApplication/DataUnit/provider —
 * the host application owns the real data export implementation.
 */
export const EzDataExporter = forwardRef<HTMLDivElement, EzDataExporterProps>(
  (
    {
      isOpen,
      onClose,
      formats = ['csv', 'xlsx', 'pdf'],
      scopes = [
        { value: 'selected', label: 'Selecionados' },
        { value: 'page', label: 'Página atual' },
        { value: 'all', label: 'Todos os registros' },
      ],
      selectedCount,
      totalCount,
      onExport,
    },
    ref
  ) => {
    const [selectedFormat, setSelectedFormat] = useState<string | undefined>(formats[0]);
    const [selectedScope, setSelectedScope] = useState<string | undefined>(scopes[0]?.value);
    const [status, setStatus] = useState<EzDataExporterStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

    const format = selectedFormat ?? formats[0];
    const scope = selectedScope ?? scopes[0]?.value;
    const isLoading = status === 'loading';

    const countFor = (scopeValue: string): number | undefined => {
      if (scopeValue === 'selected') return selectedCount;
      if (scopeValue === 'all') return totalCount;
      return undefined;
    };

    const handleExport = async () => {
      if (!format || !scope || isLoading) return;
      setStatus('loading');
      setErrorMessage(undefined);
      try {
        await onExport(format, scope);
        setStatus('success');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
        setStatus('error');
      }
    };

    const handleClose = () => {
      setStatus('idle');
      setErrorMessage(undefined);
      onClose();
    };

    return (
      <EzModal
        ref={ref}
        isOpen={isOpen}
        onClose={handleClose}
        title="Exportar dados"
        maxWidth="sm"
        footer={
          <>
            <EzButton variant="secondary" label="Cancelar" onClick={handleClose} disabled={isLoading} />
            <EzButton label="Exportar" onClick={handleExport} disabled={isLoading} />
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Format selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-gray-700">Formato</span>
            <div role="radiogroup" aria-label="Formato" className="flex flex-wrap gap-2">
              {formats.map((fmt) => {
                const checked = fmt === format;
                return (
                  <label
                    key={fmt}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-[8px] border text-[13px] font-medium cursor-pointer transition-colors',
                      checked
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="ez-data-exporter-format"
                      value={fmt}
                      checked={checked}
                      onChange={() => setSelectedFormat(fmt)}
                      disabled={isLoading}
                      className="sr-only"
                    />
                    {formatLabel(fmt)}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Scope selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-gray-700">Escopo</span>
            <div role="radiogroup" aria-label="Escopo" className="flex flex-col gap-2">
              {scopes.map((scopeOption) => {
                const checked = scopeOption.value === scope;
                const count = countFor(scopeOption.value);
                return (
                  <label
                    key={scopeOption.value}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] border text-[13px] font-medium cursor-pointer transition-colors',
                      checked
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ez-data-exporter-scope"
                        value={scopeOption.value}
                        checked={checked}
                        onChange={() => setSelectedScope(scopeOption.value)}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      {scopeOption.label}
                    </span>
                    {typeof count === 'number' && (
                      <span className="text-[12px] text-gray-400">{count}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status feedback */}
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-600">
              <EzSpinner size={18} />
              <span>Exportando dados...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-[13px] font-medium text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exportação concluída com sucesso.</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-[13px] font-medium text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>Erro ao exportar{errorMessage ? `: ${errorMessage}` : '.'}</span>
            </div>
          )}
        </div>
      </EzModal>
    );
  }
);

EzDataExporter.displayName = 'EzDataExporter';
