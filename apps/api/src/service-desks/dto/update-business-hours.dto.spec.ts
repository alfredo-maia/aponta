import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateBusinessHoursDto } from './update-business-hours.dto';

async function validatePayload(partial: Record<string, unknown>) {
  const dto = plainToInstance(UpdateBusinessHoursDto, partial);
  return validate(dto);
}

describe('UpdateBusinessHoursDto', () => {
  it('accepts non-overlapping windows on the same weekday', async () => {
    const errors = await validatePayload({
      businessHours: [
        { weekday: 1, startTime: '08:00', endTime: '12:00' },
        { weekday: 1, startTime: '13:00', endTime: '18:00' },
      ],
      holidays: [],
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts windows on different weekdays even if times overlap', async () => {
    const errors = await validatePayload({
      businessHours: [
        { weekday: 1, startTime: '08:00', endTime: '18:00' },
        { weekday: 2, startTime: '08:00', endTime: '18:00' },
      ],
      holidays: [],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects overlapping windows on the same weekday', async () => {
    const errors = await validatePayload({
      businessHours: [
        { weekday: 1, startTime: '08:00', endTime: '14:00' },
        { weekday: 1, startTime: '10:00', endTime: '18:00' },
      ],
      holidays: [],
    });
    expect(errors.some((e) => e.property === 'businessHours')).toBe(true);
  });

  it('rejects windows that exactly touch/duplicate the same weekday', async () => {
    const errors = await validatePayload({
      businessHours: [
        { weekday: 3, startTime: '08:00', endTime: '12:00' },
        { weekday: 3, startTime: '08:00', endTime: '12:00' },
      ],
      holidays: [],
    });
    expect(errors.some((e) => e.property === 'businessHours')).toBe(true);
  });
});
