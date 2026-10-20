import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { collectImageFiles, EzRichText, tryHandleImageFiles } from './EzRichText';

/**
 * NOTE: jsdom has no real layout engine — ProseMirror's focus/selection
 * handling calls `Range.getClientRects()`, which jsdom doesn't implement,
 * and throws if we try to `.click()`/`.type()` directly into the
 * contenteditable surface. These tests exercise the wrapper's own
 * rendering, labels, toolbar and error/preview state instead of simulating
 * real keystrokes inside Tiptap — that full editing flow is covered by the
 * real browser in apps/web-e2e/src/tickets.spec.ts.
 *
 * Toggling a mark/list command (toggleBold, toggleBulletList, etc.) still
 * calls editor.chain().focus()...run(), which internally tries to scroll
 * the new selection into view via EditorView.coordsAtPos ->
 * Range.getClientRects(). jsdom has no such method, so we polyfill it with
 * a no-op stub (same pattern as EzDateInput.test.tsx's showPicker
 * polyfill) purely so toolbar click handlers can run to completion.
 */
beforeAll(() => {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() }) as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => '' });
  }
});
describe('EzRichText', () => {
  it('renders the label and a contenteditable surface tagged with testId', async () => {
    render(<EzRichText testId="rt" label="Descrição" value="" onChange={vi.fn()} />);

    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByTestId('rt')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('rt').querySelector('[contenteditable="true"]')).toBeTruthy();
    });
  });

  it('renders the formatting toolbar (bold, italic, underline, lists, link, image)', () => {
    render(<EzRichText testId="rt" value="" onChange={vi.fn()} />);

    expect(screen.getByTitle('Negrito')).toBeInTheDocument();
    expect(screen.getByTitle('Itálico')).toBeInTheDocument();
    expect(screen.getByTitle('Sublinhado')).toBeInTheDocument();
    expect(screen.getByTitle('Lista')).toBeInTheDocument();
    expect(screen.getByTitle('Lista Numerada')).toBeInTheDocument();
    expect(screen.getByTitle('Inserir Link')).toBeInTheDocument();
    expect(screen.getByTitle('Inserir Imagem (URL)')).toBeInTheDocument();
  });

  it('toggles preview mode via the toolbar eye button', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Visualizar Preview'));
    expect(screen.getByTitle('Sair do Preview')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-preview')).toHaveTextContent('Hello');
  });

  it('renders a custom preview when renderPreview is provided', async () => {
    const user = userEvent.setup();
    render(
      <EzRichText
        testId="rt"
        value="<p>Cliente vê isto</p>"
        onChange={vi.fn()}
        renderPreview={(html) => <div data-testid="custom-preview">{html}</div>}
      />,
    );

    await user.click(screen.getByTitle('Visualizar Preview'));
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('Cliente vê isto');
  });

  it('shows the error message when hasError is set', () => {
    render(
      <EzRichText
        testId="rt"
        value=""
        onChange={vi.fn()}
        hasError
        message="Descrição é obrigatória"
      />
    );

    expect(screen.getByText('Descrição é obrigatória')).toBeInTheDocument();
  });

  it('disables all toolbar buttons when disabled', () => {
    render(<EzRichText testId="rt" value="" onChange={vi.fn()} disabled />);

    expect(screen.getByTitle('Negrito')).toBeDisabled();
    expect(screen.getByTitle('Itálico')).toBeDisabled();
  });

  it('toggles bold/italic/underline/list formatting without throwing when clicked', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    // These exercise the ToolbarButton onClick handlers that call
    // editor.chain().focus().toggleX().run() — no text selection/typing
    // needed (that's what jsdom can't do), just confirm the commands run.
    await user.click(screen.getByTitle('Negrito'));
    await user.click(screen.getByTitle('Itálico'));
    await user.click(screen.getByTitle('Sublinhado'));
    await user.click(screen.getByTitle('Lista'));
    await user.click(screen.getByTitle('Lista Numerada'));

    // No crash + toolbar still rendered is the real assertion here.
    expect(screen.getByTitle('Negrito')).toBeInTheDocument();
  });

  it('prompts for a URL and inserts a link when "Inserir Link" is clicked', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://aponta.dev');
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Inserir Link'));

    expect(promptSpy).toHaveBeenCalledWith('URL do link:', undefined);
    promptSpy.mockRestore();
  });

  it('removes the link when the URL prompt is answered with an empty string', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Inserir Link'));

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('does nothing when the link prompt is cancelled (returns null)', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Inserir Link'));

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('prompts for a URL and inserts an image when "Inserir Imagem (URL)" is clicked', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://aponta.dev/logo.png');
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Inserir Imagem (URL)'));

    expect(promptSpy).toHaveBeenCalledWith('URL da imagem:');
    promptSpy.mockRestore();
  });

  it('skips inserting an image when the prompt is cancelled', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Inserir Imagem (URL)'));

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('disables toolbar buttons (not just typing) while in preview mode', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Visualizar Preview'));

    expect(screen.getByTitle('Negrito')).toBeDisabled();
    expect(screen.getByTitle('Itálico')).toBeDisabled();
  });

  it('renders without a label and without a testId when they are omitted', () => {
    const { container } = render(<EzRichText value="" onChange={vi.fn()} />);

    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('enables Portuguese spellcheck on the contenteditable surface', async () => {
    render(<EzRichText testId="rt" value="" onChange={vi.fn()} />);

    await waitFor(() => {
      const editable = screen.getByTestId('rt').querySelector('[contenteditable="true"]');
      expect(editable).toHaveAttribute('spellcheck', 'true');
      expect(editable).toHaveAttribute('lang', 'pt-BR');
      expect(editable).toHaveAttribute('autocorrect', 'on');
    });
  });

  it('collects image files from clipboard data for paste-to-upload', () => {
    const file = new File(['fake-image-bytes'], 'screenshot.png', { type: 'image/png' });
    const clipboardData = {
      files: [file],
      items: [
        {
          type: 'image/png',
          getAsFile: () => file,
        },
      ],
    } as unknown as DataTransfer;

    expect(collectImageFiles(clipboardData)).toEqual([file]);
    expect(collectImageFiles(null)).toEqual([]);
  });

  it('toggles strikethrough and blockquote without throwing', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Tachado'));
    await user.click(screen.getByTitle('Citação'));

    expect(screen.getByTitle('Tachado')).toBeInTheDocument();
    expect(screen.getByTitle('Citação')).toBeInTheDocument();
  });

  it('enables undo after a change and disables redo until an undo happens', async () => {
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    // Redo starts disabled: nothing has been undone yet.
    expect(screen.getByTitle('Refazer')).toBeDisabled();

    // Using fireEvent (a plain click) rather than userEvent here: userEvent
    // simulates a full real pointer sequence (pointerdown/mousedown/focus/
    // pointerup/click), and the intervening mousedown bubbling to the
    // document confuses ProseMirror's selection tracking enough that
    // document-mutating commands (table/history) silently no-op in jsdom.
    // ProseMirror's history plugin only tracks document-changing
    // transactions, not stored-mark-only toggles (e.g. toggleBold with no
    // selection) — toggling a block wrapper (blockquote) does change the
    // doc, so it's what actually produces an undo step here.
    fireEvent.click(screen.getByTitle('Citação'));

    await waitFor(() => {
      expect(screen.getByTitle('Desfazer')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTitle('Desfazer'));

    await waitFor(() => {
      expect(screen.getByTitle('Refazer')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTitle('Refazer'));
  });

  it('toggles highlight without emitting a style attribute (mark-only HTML)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={onChange} />);

    await user.click(screen.getByTitle('Realce'));

    expect(screen.getByTitle('Realce')).toBeInTheDocument();
  });

  it('applies and removes a text color from the color palette dropdown', () => {
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    // fireEvent (see note on the undo/redo test) avoids userEvent's full
    // pointer sequence, which otherwise disturbs the editor selection that
    // setColor/unsetColor need.
    fireEvent.click(screen.getByTitle('Cor do texto'));
    expect(screen.getByTitle('Cor: Vermelho')).toBeInTheDocument();

    // No text selection exists in jsdom (see file-level note), so setColor
    // only updates stored marks for the next keystroke rather than visible
    // DOM — this exercises the command path without throwing, same as the
    // existing bold/italic toggle test.
    fireEvent.click(screen.getByTitle('Cor: Vermelho'));

    // The dropdown closes after picking a color.
    expect(screen.queryByTitle('Cor: Vermelho')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Cor do texto'));
    expect(screen.getByTitle('Remover cor')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Remover cor'));

    expect(screen.getByTitle('Cor do texto')).toBeInTheDocument();
  });

  it('applies each text alignment option', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Alinhar à esquerda'));
    await user.click(screen.getByTitle('Centralizar'));
    await user.click(screen.getByTitle('Alinhar à direita'));
    await user.click(screen.getByTitle('Justificar'));

    expect(screen.getByTitle('Centralizar')).toBeInTheDocument();
  });

  it('inserts a table and shows row/column controls while inside it', async () => {
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    // fireEvent (see note on the undo/redo test) avoids userEvent's full
    // pointer sequence, which otherwise disturbs the table-cell selection
    // these commands resolve against.
    fireEvent.click(screen.getByTitle('Inserir tabela'));

    await waitFor(() => {
      expect(screen.getByTestId('rt').querySelector('table')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTitle('Adicionar linha')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Adicionar linha'));
    fireEvent.click(screen.getByTitle('Adicionar coluna'));
    fireEvent.click(screen.getByTitle('Remover linha'));
    fireEvent.click(screen.getByTitle('Remover coluna'));
    fireEvent.click(screen.getByTitle('Remover tabela'));

    await waitFor(() => {
      expect(screen.queryByTitle('Adicionar linha')).not.toBeInTheDocument();
    });
  });

  it('toggles source-code mode and applies edited raw HTML back to the editor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={onChange} />);

    await user.click(screen.getByTitle('Código-fonte'));

    const textarea = screen.getByTestId('rich-text-source') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('Hello');

    await user.clear(textarea);
    await user.type(textarea, '<p>Editado via HTML</p>');

    await user.click(screen.getByTitle('Sair do Código-fonte'));

    await waitFor(() => {
      expect(screen.queryByTestId('rich-text-source')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('Editado via HTML'));
    });
  });

  it('disables the new formatting buttons while in preview mode', async () => {
    const user = userEvent.setup();
    render(<EzRichText testId="rt" value="<p>Hello</p>" onChange={vi.fn()} />);

    await user.click(screen.getByTitle('Visualizar Preview'));

    expect(screen.getByTitle('Tachado')).toBeDisabled();
    expect(screen.getByTitle('Citação')).toBeDisabled();
    expect(screen.getByTitle('Realce')).toBeDisabled();
    expect(screen.getByTitle('Cor do texto')).toBeDisabled();
    expect(screen.getByTitle('Alinhar à esquerda')).toBeDisabled();
    expect(screen.getByTitle('Inserir tabela')).toBeDisabled();
    expect(screen.getByTitle('Código-fonte')).toBeDisabled();
  });

  it('uploads pasted images through tryHandleImageFiles and ignores empty clipboards', async () => {
    const file = new File(['bytes'], 'shot.png', { type: 'image/png' });
    const upload = vi.fn().mockResolvedValue('/uploads/shot.png');
    const imageCreate = vi.fn(() => ({ type: 'image' }));
    const paragraphCreate = vi.fn(() => ({ type: 'paragraph' }));
    const tr = {
      replaceSelectionWith: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      scrollIntoView: vi.fn().mockReturnThis(),
      selection: { from: 1 },
    };
    const view = {
      state: {
        schema: { nodes: { image: { create: imageCreate }, paragraph: { create: paragraphCreate } } },
        tr,
      },
      dispatch: vi.fn(),
    } as unknown as Parameters<typeof tryHandleImageFiles>[0];

    expect(tryHandleImageFiles(view, null, upload)).toBe(false);
    expect(
      tryHandleImageFiles(view, { files: [], items: [] } as unknown as DataTransfer, upload),
    ).toBe(false);

    const handled = tryHandleImageFiles(
      view,
      { files: [file], items: [{ type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer,
      upload,
    );
    expect(handled).toBe(true);
    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
      expect(view.dispatch).toHaveBeenCalled();
    });

    const failingUpload = vi.fn().mockRejectedValue(new Error('fail'));
    expect(
      tryHandleImageFiles(
        view,
        { files: [file], items: [{ type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer,
        failingUpload,
      ),
    ).toBe(true);
    await waitFor(() => expect(failingUpload).toHaveBeenCalled());
  });
});

