import { ApiProperty } from '@nestjs/swagger';

export class WorkloadReportItemDto {
  @ApiProperty()
  agentId!: string;
  @ApiProperty()
  agentName!: string;
  @ApiProperty()
  totalMinutes!: number;
}

export class BillingReportItemDto {
  @ApiProperty()
  organizationId!: string;
  @ApiProperty()
  organizationName!: string;
  @ApiProperty()
  billableMinutes!: number;
  @ApiProperty()
  nonBillableMinutes!: number;
}
