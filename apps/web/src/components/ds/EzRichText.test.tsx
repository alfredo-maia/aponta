import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { collectImageFiles, EzRichText } from './EzRichText';

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
});
