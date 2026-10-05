import { HTMLAttributes, forwardRef, useRef } from 'react';
import { cn } from './utils';
import { CloudUpload, FileText, X } from 'lucide-react';

export interface EzUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Label for the dropzone */
  label?: string;
  /** Accept string, e.g. "image/*,.pdf" */
  accept?: string;
  /** Allows multiple files */
  multiple?: boolean;
  /** Error message */
  hasError?: boolean;
  message?: string;
  /** Callback fired when files are selected */
  onChange: (files: File[]) => void;
}

export const EzUpload = forwardRef<HTMLDivElement, EzUploadProps>(
  ({ label = 'Arraste e solte arquivos aqui, ou clique para buscar', accept, multiple, hasError, message, onChange, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onChange(Array.from(e.target.files));
      }
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5 w-full', className)} {...props}>
        <div 
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center w-full p-6 transition-colors border-2 border-dashed rounded-[12px] cursor-pointer group',
            hasError ? 'border-red-400 bg-red-50 hover:bg-red-100' : 'border-gray-200 bg-gray-90 hover:bg-brand-50 hover:border-brand-300'
          )}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
          />
          <CloudUpload className={cn('w-8 h-8 mb-2 transition-colors', hasError ? 'text-red-500' : 'text-gray-400 group-hover:text-brand-600')} />
          <span className={cn('text-[14px] font-medium text-center', hasError ? 'text-red-700' : 'text-gray-600 group-hover:text-brand-700')}>
            {label}
          </span>
          {accept && <span className="text-[12px] text-gray-400 mt-1">Formatos aceitos: {accept}</span>}
        </div>
        {message && (
          <div className={cn('text-[12px] font-medium mt-0.5', hasError ? 'text-red-700' : 'text-gray-500')}>
            {message}
          </div>
        )}
      </div>
    );
  }
);
EzUpload.displayName = 'EzUpload';

export interface EzFileItemProps extends HTMLAttributes<HTMLDivElement> {
  file: File;
  onRemove?: () => void;
}

export const EzFileItem = forwardRef<HTMLDivElement, EzFileItemProps>(
  ({ file, onRemove, className, ...props }, ref) => {
    const sizeKB = (file.size / 1024).toFixed(1);

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-3 bg-white border border-gray-200 rounded-[8px] transition-colors hover:border-gray-300',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center shrink-0 w-8 h-8 bg-petroleum-100 text-petroleum-600 rounded">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[14px] font-medium text-gray-900 truncate" title={file.name}>
              {file.name}
            </span>
            <span className="text-[12px] text-gray-500">{sizeKB} KB</span>
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 ml-2 text-gray-400 rounded hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remover arquivo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
EzFileItem.displayName = 'EzFileItem';
