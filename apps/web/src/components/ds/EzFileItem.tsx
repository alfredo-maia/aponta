import { cn } from './utils';
import { Download, File, Trash2 } from 'lucide-react';

export interface EzFileItemProps {
  fileName: string;
  fileSize?: string;
  onRemove?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function EzFileItem({ fileName, fileSize, onRemove, onDownload, className }: EzFileItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-none border border-gray-200 bg-white px-3 py-2',
        className
      )}
    >
      <File className="h-4 w-4 shrink-0 text-brand-600" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-gray-900">{fileName}</span>
        {fileSize && <span className="text-[11px] text-gray-500">{fileSize}</span>}
      </div>
      {onDownload && (
        <button
          onClick={onDownload}
          aria-label="Baixar"
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-90 hover:text-brand-600"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remover"
          className="rounded-full p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
