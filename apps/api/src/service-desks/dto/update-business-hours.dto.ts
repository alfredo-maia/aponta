import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { BusinessHourWindowDto } from './business-hour-window.dto';
import { HolidayDto } from './holiday.dto';

@ValidatorConstraint({ name: 'noOverlappingBusinessHours', async: false })
class NoOverlappingBusinessHoursConstraint
  implements ValidatorConstraintInterface
{
  validate(businessHours: BusinessHourWindowDto[]): boolean {
    if (!Array.isArray(businessHours)) return true;
    const byWeekday = new Map<number, BusinessHourWindowDto[]>();
    for (const w of businessHours) {
      if (
        typeof w?.weekday !== 'number' ||
        typeof w?.startTime !== 'string' ||
        typeof w?.endTime !== 'string'
      ) {
        continue; // malformed entries are reported by the nested validators
      }
      const list = byWeekday.get(w.weekday) ?? [];
      list.push(w);
      byWeekday.set(w.weekday, list);
    }

    for (const windows of byWeekday.values()) {
      const sorted = [...windows].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) return false;
      }
    }
    return true;
  }

  defaultMessage(): string {
    return 'businessHours windows must not overlap on the same weekday';
  }
}

/**
 * Full replace payload for a ServiceDesk's Expediente: the complete set of
 * weekly windows and holidays. PUT semantics (replaces everything) keeps the
 * mental model simple for a small, infrequently-edited config list.
 */
export class UpdateBusinessHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourWindowDto)
  @Validate(NoOverlappingBusinessHoursConstraint)
  businessHours!: BusinessHourWindowDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays!: HolidayDto[];
}
