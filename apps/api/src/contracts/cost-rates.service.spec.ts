import { Role } from '@prisma/client';
import { CostRatesService } from './cost-rates.service';

describe('CostRatesService', () => {
  const admin = { id: 'a', role: Role.ADMIN };
  const dto = { userId: 'u', effectiveFrom: '2026-10-02T03:00:00Z', hourlyCostCents: 5000 };
  let db: any;
  let service: CostRatesService;
  beforeEach(() => {
    db = { $executeRaw: jest.fn(), user: { findUnique: jest.fn().mockResolvedValue({ id: 'u', role: Role.AGENT }) }, technicianCostRate: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(({ data }) => data), findMany: jest.fn().mockResolvedValue([]) }, worklog: { findFirst: jest.fn().mockResolvedValue(null) } };
    db.$transaction = jest.fn(callback => callback(db));
    service = new CostRatesService(db);
  });
  it('denies non administrators before reading individual costs', async () => {
    await expect(service.list({ id: 'u', role: Role.AGENT_MASTER })).rejects.toThrow();
    await expect(service.create(dto, { id: 'u', role: Role.AGENT })).rejects.toThrow();
    expect(db.technicianCostRate.findMany).not.toHaveBeenCalled();
  });
  it('allows explicit zero, takes a user row lock and appends a rate', async () => {
    expect(await service.create({ ...dto, hourlyCostCents: 0 }, admin)).toMatchObject({ hourlyCostCents: 0, createdBy: admin.id });
    expect(db.$executeRaw).toHaveBeenCalled();
  });
  it('rejects nontechnical users and invalid money', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u', role: Role.CLIENT });
    await expect(service.create(dto, admin)).rejects.toThrow();
    for (const hourlyCostCents of [-1, 1.5, NaN, 2147483648]) await expect(service.create({ ...dto, hourlyCostCents }, admin)).rejects.toThrow();
  });
  it('requires strictly increasing effective dates and prevents repricing recorded effort', async () => {
    db.technicianCostRate.findFirst.mockResolvedValue({ effectiveFrom: new Date(dto.effectiveFrom) });
    await expect(service.create(dto, admin)).rejects.toThrow();
    db.technicianCostRate.findFirst.mockResolvedValue(null);
    db.worklog.findFirst.mockResolvedValue({ endTime: new Date(dto.effectiveFrom) });
    await expect(service.create(dto, admin)).rejects.toThrow();
    expect(db.technicianCostRate.create).not.toHaveBeenCalled();
  });
});
