import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isBlankRichText, isSafeMediaUrl, RichContentView } from './RichContentView';

describe('isBlankRichText', () => {
  it('treats empty and placeholder paragraph as blank', () => {
    expect(isBlankRichText('')).toBe(true);
    expect(isBlankRichText('<p></p>')).toBe(true);
    expect(isBlankRichText('<p><br></p>')).toBe(true);
    expect(isBlankRichText('   ')).toBe(true);
  });

  it('treats text or images as content', () => {
    expect(isBlankRichText('<p>Diagnóstico ok</p>')).toBe(false);
    expect(isBlankRichText('<img src="/uploads/a.png" alt="tela">')).toBe(false);
  });
});

describe('isSafeMediaUrl', () => {
  it('allows relative uploads and http(s) urls', () => {
    expect(isSafeMediaUrl('/uploads/a.png')).toBe(true);
    expect(isSafeMediaUrl('https://cdn.aponta.com/tela.png')).toBe(true);
  });

  it('rejects javascript and data urls', () => {
    expect(isSafeMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeMediaUrl('data:image/png;base64,abc')).toBe(false);
  });
});

describe('RichContentView', () => {
  it('renders plain text', () => {
    render(<RichContentView content="Diagnóstico concluído" />);
    expect(screen.getByText('Diagnóstico concluído')).toBeInTheDocument();
  });

  it('renders markdown images as elegant evidence cards', () => {
    render(
      <RichContentView content={'Erro na tela:\n![evidencia.png](https://cdn.aponta.com/tela.png)'} />,
    );

    expect(screen.getByText('Erro na tela:')).toBeInTheDocument();
    expect(screen.getByAltText('evidencia.png')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir em tamanho real/i })).toHaveAttribute(
      'href',
      'https://cdn.aponta.com/tela.png',
    );
  });

  it('renders html images without exposing raw markup to the client', () => {
    render(
      <RichContentView content='<p>Segue evidência:</p><img src="/uploads/shot.png" alt="Tela do erro">' />,
    );

    expect(screen.getByText('Segue evidência:')).toBeInTheDocument();
    expect(screen.getByAltText('Tela do erro')).toBeInTheDocument();
    expect(screen.queryByText(/<img/i)).not.toBeInTheDocument();
  });

  it('strips scripts and unsafe image sources', () => {
    render(
      <RichContentView content={'<p>Ok</p><script>alert(1)</script><img src="javascript:alert(1)" alt="x">'} />,
    );

    expect(screen.getByText('Ok')).toBeInTheDocument();
    expect(screen.queryByAltText('x')).not.toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
