import { forwardRef, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from './utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';

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

function insertImageAtCursor(view: EditorView, url: string, alt: string) {
  const image = view.state.schema.nodes.image;
  if (!image) return;
  const node = image.create({ src: url, alt });
  view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
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
    },
    ref,
  ) => {
    const [isPreview, setIsPreview] = useState(false);
    const onUploadImageRef = useRef(onUploadImage);
    onUploadImageRef.current = onUploadImage;

    const editor = useEditor({
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
            class: 'max-w-full h-auto rounded-lg border border-gray-200 my-3 shadow-sm',
          },
        }),
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
          const upload = onUploadImageRef.current;
          if (!upload) return false;
          const files = collectImageFiles(event.clipboardData ?? null);
          if (files.length === 0) return false;
          event.preventDefault();
          void (async () => {
            for (const file of files) {
              try {
                const url = await upload(file);
                insertImageAtCursor(_view, url, file.name || 'Evidência anexada');
              } catch {
                // Consumer is responsible for surfacing upload errors.
              }
            }
          })();
          return true;
        },
        handleDrop(_view, event) {
          const upload = onUploadImageRef.current;
          if (!upload) return false;
          const files = collectImageFiles(event.dataTransfer ?? null);
          if (files.length === 0) return false;
          event.preventDefault();
          void (async () => {
            for (const file of files) {
              try {
                const url = await upload(file);
                insertImageAtCursor(_view, url, file.name || 'Evidência anexada');
              } catch {
                // Consumer is responsible for surfacing upload errors.
              }
            }
          })();
          return true;
        },
      },
    });

    useEffect(() => {
      if (editor && editor.isEditable !== (!disabled && !isPreview)) {
        editor.setEditable(!disabled && !isPreview);
      }
    }, [disabled, isPreview, editor]);

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

            <div className="flex-1" />

            <ToolbarButton
              icon={isPreview ? EyeOff : Eye}
              title={isPreview ? 'Sair do Preview' : 'Visualizar Preview'}
              active={isPreview}
              onClick={() => setIsPreview(!isPreview)}
            />
          </div>

          {/* Editor Area */}
          <div
            data-testid={testId}
            className={cn(
              'w-full max-h-[400px] overflow-y-auto',
              isPreview ? 'bg-gray-80' : 'bg-white'
            )}
          >
            <EditorContent editor={editor} />
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
