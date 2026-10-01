import { getSlaStatus, SlaStatus } from './sla-status';

describe('getSlaStatus', () => {
  it('returns ON_TRACK when less than 80% of the window has elapsed', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-01T10:00:00.000Z'); // 10h window
    const now = new Date('2026-01-01T05:00:00.000Z'); // 50% elapsed

    expect(getSlaStatus(createdAt, deadline, now)).toBe<SlaStatus>('ON_TRACK');
  });

  it('returns AT_RISK when 80% or more of the window has elapsed but not yet due', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T08:30:00.000Z'); // 85% elapsed

    expect(getSlaStatus(createdAt, deadline, now)).toBe<SlaStatus>('AT_RISK');
  });

  it('returns BREACHED when now is past the deadline', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T10:00:01.000Z');

    expect(getSlaStatus(createdAt, deadline, now)).toBe<SlaStatus>('BREACHED');
  });

  it('returns null when there is no deadline configured', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-01T05:00:00.000Z');

    expect(getSlaStatus(createdAt, null, now)).toBeNull();
  });

  it('treats exactly the deadline instant as BREACHED (boundary)', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-01T10:00:00.000Z');

    expect(getSlaStatus(createdAt, deadline, deadline)).toBe<SlaStatus>(
      'BREACHED',
    );
  });
});
