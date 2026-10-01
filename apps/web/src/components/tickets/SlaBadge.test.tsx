import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlaBadge } from './SlaBadge';

describe('SlaBadge', () => {
  it('renders nothing when status is null or undefined', () => {
    const { container: c1 } = render(<SlaBadge status={null} label="Resposta" />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<SlaBadge status={undefined} label="Resposta" />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('renders a green "Dentro do prazo" badge for ON_TRACK', () => {
    render(<SlaBadge status="ON_TRACK" label="Resposta" />);
    const badge = screen.getByText(/dentro do prazo/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/green/);
  });

  it('renders a yellow "Em risco" badge for AT_RISK', () => {
    render(<SlaBadge status="AT_RISK" label="Resposta" />);
    const badge = screen.getByText(/em risco/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/yellow|amber/);
  });

  it('renders a red "Vencido" badge for BREACHED', () => {
    render(<SlaBadge status="BREACHED" label="Resolução" />);
    const badge = screen.getByText(/vencido/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/red/);
  });

  it('includes the provided label in the accessible text', () => {
    render(<SlaBadge status="BREACHED" label="Resolução" />);
    expect(screen.getByText(/resolução/i)).toBeInTheDocument();
  });
});
