import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BusinessHourWindowDto } from './business-hour-window.dto';

async function validateWindow(partial: Partial<BusinessHourWindowDto>) {
  const dto = plainToInstance(BusinessHourWindowDto, partial);
  return validate(dto);
}

describe('BusinessHourWindowDto', () => {
  it('accepts a valid window', async () => {
    const errors = await validateWindow({
      weekday: 1,
      startTime: '08:00',
      endTime: '18:00',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects weekday out of range (7)', async () => {
    const errors = await validateWindow({
      weekday: 7,
      startTime: '08:00',
      endTime: '18:00',
    });
    expect(errors.some((e) => e.property === 'weekday')).toBe(true);
  });

  it('rejects weekday out of range (negative)', async () => {
    const errors = await validateWindow({
      weekday: -1,
      startTime: '08:00',
      endTime: '18:00',
    });
    expect(errors.some((e) => e.property === 'weekday')).toBe(true);
  });

  it('rejects a malformed startTime', async () => {
    const errors = await validateWindow({
      weekday: 1,
      startTime: '25:00',
      endTime: '18:00',
    });
    expect(errors.some((e) => e.property === 'startTime')).toBe(true);
  });

  it('rejects a malformed endTime', async () => {
    const errors = await validateWindow({
      weekday: 1,
      startTime: '08:00',
      endTime: 'not-a-time',
    });
    expect(errors.some((e) => e.property === 'endTime')).toBe(true);
  });

  it('rejects a window where startTime is after endTime', async () => {
    const errors = await validateWindow({
      weekday: 1,
      startTime: '18:00',
      endTime: '08:00',
    });
    expect(errors.some((e) => e.property === 'endTime')).toBe(true);
  });

  it('rejects a window where startTime equals endTime (zero-length)', async () => {
    const errors = await validateWindow({
      weekday: 1,
      startTime: '10:00',
      endTime: '10:00',
    });
    expect(errors.some((e) => e.property === 'endTime')).toBe(true);
  });
});
