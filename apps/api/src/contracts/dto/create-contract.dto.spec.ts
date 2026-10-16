import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';
import { UpdateContractDto } from './update-contract.dto';

describe('Contract request validation', () => {
  const organizationId = '879ffb5e-b5c2-43ed-993c-922c49adbbdd';

  it.each([
    { name: '' }, { name: '   ' }, { name: 123 }, { name: 'x'.repeat(201) },
    { includedMinutes: -1 }, { includedMinutes: 0.5 }, { includedMinutes: 2147483648 },
    { excessHourlyRateCents: -1 }, { excessHourlyRateCents: 0.5 },
    { excessHourlyRateCents: '12000' }, { hoursLimit: 0.5 },
    { monthlyValue: -0.01 }, { lastAmendmentValue: -1 },
    { startsAt: 'not-a-date' }, { endsAt: '2026-50-01' },
  ])('rejects invalid create and partial update: %j', async (fields) => {
    expect(await validate(plainToInstance(CreateContractDto, { organizationId, ...fields }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateContractDto, fields))).not.toHaveLength(0);
  });

  it('accepts explicit zero, nullable unknown rates, and partial deactivation', async () => {
    expect(await validate(plainToInstance(CreateContractDto, {
      organizationId, name: 'Suporte', includedMinutes: 0, excessHourlyRateCents: 0,
      monthlyValue: 0, startsAt: '2026-10-01', endsAt: null,
    }))).toEqual([]);
    expect(await validate(plainToInstance(UpdateContractDto, { excessHourlyRateCents: null, active: false }))).toEqual([]);
  });
});
