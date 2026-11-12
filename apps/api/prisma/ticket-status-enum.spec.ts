import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * DMTE-490 AC-04: contrato do enum de status. A migração é aditiva (só
 * `ADD VALUE`, sem alterar nem remover valores existentes) e o schema
 * Prisma declara o valor novo depois de "Aguardando Terceiros" (ON_HOLD).
 */
const schema = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');
const enumBody = /enum TicketStatus \{([^}]*)\}/.exec(schema)?.[1] ?? '';

describe('TicketStatus enum (DMTE-490 AC-04)', () => {
  it('declares PENDING_SANKHYA and keeps every previous value', () => {
    const values = enumBody.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(values).toEqual([
      'ESCALATED',
      'PENDING_CUSTOMER',
      'ON_HOLD',
      'PENDING_APPROVAL',
      'PENDING_SANKHYA',
      'OPEN',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });

  it('adds the value with a purely additive migration', () => {
    const migrations = join(__dirname, 'migrations');
    const sql = readdirSync(migrations, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => readFileSync(join(migrations, d.name, 'migration.sql'), 'utf8'))
      .filter((text) => text.includes('PENDING_SANKHYA'));

    expect(sql).toHaveLength(1);
    expect(sql[0].trim()).toBe(`ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_SANKHYA';`);
  });
});
