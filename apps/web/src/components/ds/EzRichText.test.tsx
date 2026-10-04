import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EzRichText } from './EzRichText';

/**
 * NOTE: jsdom has no real layout engine — ProseMirror's focus/selection
 * handling calls `Range.getClientRects()`, which jsdom doesn't implement,
 * and throws if we try to `.click()`/`.type()` directly into the
 * contenteditable surface. These tests exercise the wrapper's own
 * rendering, labels, toolbar and error/preview state instead of simulating
 * real keystrokes inside Tiptap — that full editing flow is covered by the
 * real browser in apps/web-e2e/src/tickets.spec.ts.
 */
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
});
