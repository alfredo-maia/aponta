import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

@ValidatorConstraint({ name: 'isAfterStartTime', async: false })
class IsAfterStartTimeConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments): boolean {
    const obj = args.object as { startTime?: string };
    if (!obj.startTime || !TIME_PATTERN.test(obj.startTime)) return true; // let @Matches on startTime report that error instead
    if (!TIME_PATTERN.test(endTime)) return true; // let @Matches on endTime report that error instead
    return endTime > obj.startTime;
  }

  defaultMessage(): string {
    return 'endTime must be strictly after startTime';
  }
}

export class BusinessHourWindowDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  @Validate(IsAfterStartTimeConstraint)
  endTime!: string;
}
