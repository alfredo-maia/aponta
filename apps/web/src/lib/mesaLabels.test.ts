import { describe, expect, it } from 'vitest';
import { ticketSectionLabel } from './mesaLabels';

describe('ticketSectionLabel', () => {
  it('maps database section keys to Portuguese labels', () => {
    expect(ticketSectionLabel('GENERAL_INFO')).toBe('Informações gerais');
    expect(ticketSectionLabel('WORKLOGS')).toBe('Apontamentos');
    expect(ticketSectionLabel('UNKNOWN_KEY')).toBe('UNKNOWN_KEY');
  });
});
