import { HTMLAttributes, forwardRef, useRef } from 'react';
import { cn } from './utils';
import {
  CloudUpload,
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** A single attachment to be displayed by EzAttachmentList. */
export type EzAttachment = {
  /** Unique identifier of the attachment, used by the action callbacks. */
  id: string;
  /** File name, including extension, shown as the item's title. */
  name: string;
  /** File size in bytes, formatted for display when provided. */
  size?: number;
  /** URL used to view/download the file, if available. */
  url?: string;
};

export type EzAttachmentListProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** Attachments to render in the list. */
  attachments: EzAttachment[];
  /** Called with the attachment id when the "view" action is clicked. */
  onView?: (id: string) => void;
  /** Called with the attachment id when the "download" action is clicked. */
  onDownload?: (id: string) => void;
  /** Called with the attachment id when the "remove" action is clicked. */
  onRemove?: (id: string) => void;
  /** Called with the picked files when new attachments are added via the dropzone. */
  onAdd?: (files: File[]) => void;
  /** Label for the add dropzone. @default 'Arraste e solte arquivos aqui, ou clique para buscar' */
  addLabel?: string;
  /** Message shown when there are no attachments. @default 'Nenhum anexo adicionado.' */
  emptyMessage?: string;
};

function formatFileSize(bytes?: number): string | undefined {
  if (bytes === undefined || bytes === null) {
    return undefined;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

const EXTENSION_ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  rtf: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  zip: FileArchive,
  rar: FileArchive,
  '7z': FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  mp4: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  gif: ImageIcon,
  svg: ImageIcon,
  webp: ImageIcon,
};

function getIconForFileName(name: string): LucideIcon {
  const extension = name.split('.').pop()?.toLowerCase();
  return (extension && EXTENSION_ICONS[extension]) || File;
}

/**
 * Aponta DS Attachment List
 * Generic list of attachments with name, size, and type icon, plus
 * view/download/remove actions and an optional dropzone to add new files.
 * Mirrors the visual behavior of Sankhya DS `snk-attach`, without any of its
 * SnkApplication/DataUnit/registerKey/entityName integration concerns.
 */
export const EzAttachmentList = forwardRef<HTMLDivElement, EzAttachmentListProps>(
  (
    {
      attachments,
      onView,
      onDownload,
      onRemove,
      onAdd,
      addLabel = 'Arraste e solte arquivos aqui, ou clique para buscar',
      emptyMessage = 'Nenhum anexo adicionado.',
      className,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        onAdd?.(Array.from(event.target.files));
        event.target.value = '';
      }
    };

    return (
      <div ref={ref} className={cn('flex w-full flex-col gap-2', className)} {...props}>
        {attachments.length === 0 && (
          <span className="text-[13px] text-gray-500">{emptyMessage}</span>
        )}

        {attachments.map((attachment) => {
          const Icon = getIconForFileName(attachment.name);
          const formattedSize = formatFileSize(attachment.size);

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-3 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-petroleum-100 text-petroleum-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium text-gray-900" title={attachment.name}>
                  {attachment.name}
                </span>
                {formattedSize && <span className="text-[11px] text-gray-500">{formattedSize}</span>}
              </div>

              {onView && (
                <button
                  type="button"
                  onClick={() => onView(attachment.id)}
                  aria-label="Visualizar anexo"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-90 hover:text-brand-600"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(attachment.id)}
                  aria-label="Baixar anexo"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-90 hover:text-brand-600"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(attachment.id)}
                  aria-label="Remover anexo"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}

        {onAdd && (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-gray-200 bg-gray-90 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <input
              type="file"
              ref={inputRef}
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            <CloudUpload className="h-6 w-6 text-gray-400" />
            <span className="text-[13px] font-medium text-gray-600">{addLabel}</span>
          </div>
        )}
      </div>
    );
  }
);

EzAttachmentList.displayName = 'EzAttachmentList';
