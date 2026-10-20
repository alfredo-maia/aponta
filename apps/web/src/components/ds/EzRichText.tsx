import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { cn } from './utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Quote,
  Undo2,
  Redo2,
  Highlighter,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table2,
  Rows3,
  Columns3,
  Trash2,
  Code2,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';

/** Fixed, backend-safe palette: the sanitizer only keeps explicit hex/rgb
 * `color`/`background-color` values, so we offer a small curated set
 * instead of a free-form native color input. */
const TEXT_COLORS: Array<{ label: string; value: string }> = [
  { label: 'Padrão', value: '#111827' },
  { label: 'Vermelho', value: '#dc2626' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Laranja', value: '#ea580c' },
  { label: 'Roxo', value: '#7c3aed' },
];

export interface EzRichTextProps {
  /**
   * The text label displayed above the editor.
   */
  label?: string;
  /**
   * Optional helper or error message displayed below.
   */
  message?: string;
  /**
   * Indicates an error state (red border).
   */
  hasError?: boolean;
  /**
   * The initial HTML content.
   */
  value?: string;
  /**
   * Callback fired when content changes.
   */
  onChange?: (html: string) => void;
  /**
   * If true, disables editing.
   */
  disabled?: boolean;
  /**
   * CSS class.
   */
  className?: string;
  /**
   * Forwarded to the contenteditable editor surface as `data-testid`,
   * so E2E/integration tests can target it directly (Tiptap renders a
   * plain contenteditable div, not a native <textarea>/<input>).
   */
  testId?: string;
  /**
   * Uploads a pasted/dropped image and returns a durable URL.
   * When provided, clipboard images are uploaded instead of being
   * inlined as base64 — required for client-facing documentation.
   */
  onUploadImage?: (file: File) => Promise<string>;
  /**
   * Native browser spellcheck on the contenteditable surface.
   */
  spellCheck?: boolean;
  /**
   * BCP 47 language tag used by the native spellchecker.
   */
  lang?: string;
  /**
   * Extra class for the editor min-height.
   */
  minHeightClass?: string;
  /**
   * Optional renderer used by the preview (eye) mode so the technician
   * sees the same layout the client will receive.
   */
  renderPreview?: (html: string) => ReactNode;
}

function normalizeEditorHtml(html: string | undefined): string {
  const value = (html || '').trim();
  if (!value || value === '<p></p>') return '';
  return value;
}

export function collectImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  if (data.files?.length) {
    for (const file of Array.from(data.files)) {
      if (file.type.startsWith('image/')) files.push(file);
    }
  }
  if (files.length === 0 && data.items) {
    for (const item of Array.from(data.items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  return files;
}

export function insertImageAtCursor(view: EditorView, url: string, alt: string) {
  const image = view.state.schema.nodes.image;
  if (!image) return;
  const imageNode = image.create({ src: url, alt });
  let tr = view.state.tr.replaceSelectionWith(imageNode);
  const paragraph = view.state.schema.nodes.paragraph;
  if (paragraph) {
    tr = tr.insert(tr.selection.from, paragraph.create());
  }
  view.dispatch(tr.scrollIntoView());
}

export function tryHandleImageFiles(
  view: EditorView,
  data: DataTransfer | null,
  upload?: (file: File) => Promise<string>,
): boolean {
  if (!upload) return false;
  const files = collectImageFiles(data);
  if (files.length === 0) return false;
  void (async () => {
    for (const file of files) {
      try {
        const url = await upload(file);
        insertImageAtCursor(view, url, file.name || 'Evidência anexada');
      } catch {
        // Consumer surfaces upload errors.
      }
    }
  })();
  return true;
}

/**
 * Aponta DS Rich Text Editor (Tiptap based, inspired by @sankhyalabs/ezui)
 * Features: Bold, Italic, Underline, Bullet List, Numbered List, Link, Image, and Preview Mode.
 */
export const EzRichText = forwardRef<HTMLDivElement, EzRichTextProps>(
  (
    {
      label,
      message,
      hasError = false,
      value = '',
      onChange,
      disabled = false,
      className,
      testId,
      onUploadImage,
      spellCheck = true,
      lang = 'pt-BR',
      minHeightClass = 'min-h-[120px]',
      renderPreview,
    },
    ref,
  ) => {
    const [isPreview, setIsPreview] = useState(false);
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [sourceValue, setSourceValue] = useState('');
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const onUploadImageRef = useRef(onUploadImage);
    onUploadImageRef.current = onUploadImage;

    const editor = useEditor({
      // Tiptap v3 no longer re-renders the host component on every
      // transaction by default. The toolbar's active/disabled states
      // (bold/italic highlighting, table-context buttons, undo/redo)
      // all read live editor state on each render, so they need it on.
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit,
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-brand-600 underline cursor-pointer',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'block mx-auto max-w-full h-auto rounded-lg my-4',
          },
        }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        Highlight,
      ],
      content: value,
      editable: !disabled && !isPreview,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm max-w-none focus:outline-none p-4 text-gray-900',
            minHeightClass,
          ),
          spellcheck: spellCheck ? 'true' : 'false',
          lang,
          autocorrect: 'on',
          autocapitalize: 'sentences',
        },
        handlePaste(_view, event) {
          if (!tryHandleImageFiles(_view, event.clipboardData ?? null, onUploadImageRef.current)) {
            return false;
          }
          event.preventDefault();
          return true;
        },
        handleDrop(_view, event) {
          if (!tryHandleImageFiles(_view, event.dataTransfer ?? null, onUploadImageRef.current)) {
            return false;
          }
          event.preventDefault();
          return true;
        },
      },
    });

    useEffect(() => {
      const shouldBeEditable = !disabled && !isPreview && !isSourceMode;
      if (editor && editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    }, [disabled, isPreview, isSourceMode, editor]);

    useEffect(() => {
      if (!editor) return;
      const current = normalizeEditorHtml(editor.getHTML());
      const next = normalizeEditorHtml(value);
      if (current === next) return;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }, [value, editor]);

    // Toolbar button component
    const ToolbarButton = ({
      active,
      onClick,
      disabled: btnDisabled,
      icon: IconNode,
      title,
    }: any) => (
      <button
        type="button"
        disabled={btnDisabled || disabled}
        onClick={onClick}
        title={title}
        className={cn(
          'p-1.5 rounded transition-colors',
          active
            ? 'bg-brand-100 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          (btnDisabled || disabled) && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-600'
        )}
      >
        <IconNode className="w-4 h-4" />
      </button>
    );

    const handleAddLink = () => {
      if (!editor) return;
      const previousUrl = editor.getAttributes('link').href;
      const url = window.prompt('URL do link:', previousUrl);

      if (url === null) return;
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const handleAddImage = () => {
      const url = window.prompt('URL da imagem:');
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    };

    const handleSetColor = (color: string) => {
      editor?.chain().focus().setColor(color).run();
      setIsColorPickerOpen(false);
    };

    const handleUnsetColor = () => {
      editor?.chain().focus().unsetColor().run();
      setIsColorPickerOpen(false);
    };

    const handleToggleSourceMode = () => {
      if (!editor) return;
      if (isSourceMode) {
        editor.commands.setContent(sourceValue);
        setIsSourceMode(false);
      } else {
        setSourceValue(editor.getHTML());
        setIsColorPickerOpen(false);
        setIsSourceMode(true);
      }
    };

    // New formatting controls (table/alignment/color/strike/etc.) are
    // meaningless while previewing the rendered HTML or editing raw source,
    // so they share this single disabled flag.
    const formattingDisabled = isPreview || isSourceMode;

    return (
      <div className={cn('flex flex-col w-full gap-1.5', className)} ref={ref}>
        {label && (
          <label
            className={cn(
              'text-[14px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900',
              hasError && 'text-red-700'
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'flex flex-col w-full border rounded-[12px] bg-white overflow-hidden transition-colors',
            hasError ? 'border-red-600' : 'border-gray-200 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
            disabled && 'bg-gray-80 border-gray-100'
          )}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-1.5 border-b border-gray-200 bg-gray-80 flex-wrap">
            <ToolbarButton
              icon={Bold}
              title="Negrito"
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={isPreview}
            />
            <ToolbarButton
              icon={Italic}
              title="Itálico"
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={isPreview}
            />
            <ToolbarButton
              icon={UnderlineIcon}
              title="Sublinhado"
              active={editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={isPreview}
            />
            <ToolbarButton
              icon={Strikethrough}
              title="Tachado"
              active={editor?.isActive('strike')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              disabled={formattingDisabled}
            />
            <ToolbarButton
              icon={Highlighter}
              title="Realce"
              active={editor?.isActive('highlight')}
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              disabled={formattingDisabled}
            />

            <div className="relative">
              <ToolbarButton
                icon={Palette}
                title="Cor do texto"
                active={isColorPickerOpen}
                onClick={() => setIsColorPickerOpen((prev) => !prev)}
                disabled={formattingDisabled}
              />
              {isColorPickerOpen && (
                <div className="absolute z-10 top-full left-0 mt-1 flex flex-wrap gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg w-[140px]">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={`Cor: ${color.label}`}
                      onClick={() => handleSetColor(color.value)}
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                  <button
                    type="button"
                    title="Remover cor"
                    onClick={handleUnsetColor}
                    className="w-full mt-1 text-[11px] text-gray-600 hover:text-gray-900 text-left"
                  >
                    Remover cor
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={Quote}
              title="Citação"
              active={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              disabled={formattingDisabled}
            />

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={AlignLeft}
              title="Alinhar à esquerda"
              active={editor?.isActive({ textAlign: 'left' })}
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              disabled={formattingDisabled}
            />
            <ToolbarButton
              icon={AlignCenter}
              title="Centralizar"
              active={editor?.isActive({ textAlign: 'center' })}
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              disabled={formattingDisabled}
            />
            <ToolbarButton
              icon={AlignRight}
              title="Alinhar à direita"
              active={editor?.isActive({ textAlign: 'right' })}
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              disabled={formattingDisabled}
            />
            <ToolbarButton
              icon={AlignJustify}
              title="Justificar"
              active={editor?.isActive({ textAlign: 'justify' })}
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              disabled={formattingDisabled}
            />

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={List}
              title="Lista"
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={isPreview}
            />
            <ToolbarButton
              icon={ListOrdered}
              title="Lista Numerada"
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={isPreview}
            />

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={Link2}
              title="Inserir Link"
              active={editor?.isActive('link')}
              onClick={handleAddLink}
              disabled={isPreview}
            />
            <ToolbarButton
              icon={ImageIcon}
              title="Inserir Imagem (URL)"
              onClick={handleAddImage}
              disabled={isPreview}
            />

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={Table2}
              title="Inserir tabela"
              active={editor?.isActive('table')}
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={formattingDisabled}
            />
            {editor?.isActive('table') && (
              <>
                <ToolbarButton
                  icon={Rows3}
                  title="Adicionar linha"
                  onClick={() => editor?.chain().focus().addRowAfter().run()}
                  disabled={formattingDisabled}
                />
                <ToolbarButton
                  icon={Rows3}
                  title="Remover linha"
                  onClick={() => editor?.chain().focus().deleteRow().run()}
                  disabled={formattingDisabled}
                />
                <ToolbarButton
                  icon={Columns3}
                  title="Adicionar coluna"
                  onClick={() => editor?.chain().focus().addColumnAfter().run()}
                  disabled={formattingDisabled}
                />
                <ToolbarButton
                  icon={Columns3}
                  title="Remover coluna"
                  onClick={() => editor?.chain().focus().deleteColumn().run()}
                  disabled={formattingDisabled}
                />
                <ToolbarButton
                  icon={Trash2}
                  title="Remover tabela"
                  onClick={() => editor?.chain().focus().deleteTable().run()}
                  disabled={formattingDisabled}
                />
              </>
            )}

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={Undo2}
              title="Desfazer"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={formattingDisabled || !editor?.can().undo()}
            />
            <ToolbarButton
              icon={Redo2}
              title="Refazer"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={formattingDisabled || !editor?.can().redo()}
            />

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <ToolbarButton
              icon={Code2}
              title={isSourceMode ? 'Sair do Código-fonte' : 'Código-fonte'}
              active={isSourceMode}
              onClick={handleToggleSourceMode}
              disabled={isPreview}
            />

            <div className="flex-1" />

            <ToolbarButton
              icon={isPreview ? EyeOff : Eye}
              title={isPreview ? 'Sair do Preview' : 'Visualizar Preview'}
              active={isPreview}
              onClick={() => setIsPreview((prev) => !prev)}
              disabled={isSourceMode}
            />
          </div>

          {/* Editor / Preview / Source Area */}
          <div
            data-testid={testId}
            className={cn(
              'w-full max-h-[400px] overflow-y-auto',
              isPreview ? 'bg-gray-50' : 'bg-white',
            )}
          >
            {isSourceMode ? (
              <div className="flex flex-col">
                <textarea
                  data-testid="rich-text-source"
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  className={cn(
                    'w-full p-4 font-mono text-xs text-gray-900 focus:outline-none resize-none',
                    minHeightClass,
                  )}
                />
                <div className="flex justify-end gap-2 p-2 border-t border-gray-200 bg-gray-80">
                  <button
                    type="button"
                    onClick={handleToggleSourceMode}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            ) : isPreview ? (
              <div
                data-testid="rich-text-preview"
                className={cn(
                  'prose prose-sm max-w-none p-4 text-gray-900 [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:min-h-[1.5em]',
                  minHeightClass,
                )}
              >
                {renderPreview
                  ? renderPreview(editor?.getHTML() || value || '')
                  : (
                    <div
                      dangerouslySetInnerHTML={{ __html: editor?.getHTML() || value || '' }}
                    />
                  )}
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[12px] font-medium leading-none mt-0.5',
              hasError ? 'text-red-700' : 'text-gray-500',
              disabled && 'text-gray-400'
            )}
          >
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }
);

EzRichText.displayName = 'EzRichText';
