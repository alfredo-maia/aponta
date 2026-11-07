import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzSlaChip, slaChipTokenPairs } from './EzSlaChip';

const NOW = new Date('2026-01-10T12:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const H = 3600000;

describe('EzSlaChip (AC-06)', () => {
  it('renders nothing when there is no SLA status', () => {
    const { container } = render(<EzSlaChip kind="response" status={null} now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the remaining time and a full accessible name/tooltip when on track', () => {
    render(<EzSlaChip kind="response" status="ON_TRACK" deadline={at(17 * H + 18 * 60000)} now={NOW} />);
    const chip = screen.getByLabelText('Resposta: dentro do prazo, vence em 17h18');
    expect(chip).toHaveTextContent('17h18');
    expect(chip).toHaveAttribute('title', 'Resposta: dentro do prazo, vence em 17h18');
    expect(screen.queryByText(/dentro do prazo/i)).not.toBeInTheDocument();
  });

  it('shows a negative time for a breached deadline', () => {
    render(<EzSlaChip kind="resolve" status="BREACHED" deadline={at(-3 * 24 * H - H)} now={NOW} />);
    const chip = screen.getByLabelText('Resolução: vencido há 3d');
    expect(chip).toHaveTextContent('-3d');
  });

  it('shows minutes when less than one hour is left', () => {
    render(<EzSlaChip kind="response" status="AT_RISK" deadline={at(45 * 60000)} now={NOW} />);
    expect(screen.getByLabelText('Resposta: em risco, vence em 45min')).toHaveTextContent('45min');
  });

  it('keeps only icon and state when the deadline is unknown', () => {
    render(<EzSlaChip kind="resolve" status="ON_TRACK" now={NOW} />);
    const chip = screen.getByLabelText('Resolução: dentro do prazo');
    expect(chip.textContent).toBe('');
  });

  it('uses token pairs with at least AA contrast (4.5:1) for text over background', () => {
    const css = readFileSync(resolve(__dirname, '../../styles.css'), 'utf8');
    const hex = (token: string) => {
      const match = css.match(new RegExp(`--color-${token}:\\s*#([0-9a-f]{6})`, 'i'));
      if (!match) throw new Error('token not found: ' + token);
      return match[1];
    };
    const luminance = (value: string) =>
      [0, 2, 4]
        .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const statuses = ['ON_TRACK', 'AT_RISK', 'BREACHED'] as const;
    expect(Object.keys(slaChipTokenPairs).sort()).toEqual([...statuses].sort());
    for (const status of statuses) {
      const [text, background] = slaChipTokenPairs[status];
      const [a, b] = [luminance(hex(text)), luminance(hex(background))].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
