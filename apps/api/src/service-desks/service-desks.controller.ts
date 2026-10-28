import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ServiceDesksService } from './service-desks.service';
import { CreateServiceDeskDto } from './dto/create-service-desk.dto';
import { UpdateServiceDeskDto } from './dto/update-service-desk.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TicketStagesService } from './ticket-stages.service';
import {
  CreateTicketStageDto,
  ReorderTicketStagesDto,
  UpdateTicketStageDto,
} from './dto/ticket-stage.dto';

@Controller('service-desks')
@UseGuards(JwtAuthGuard)
export class ServiceDesksController {
  constructor(
    private readonly serviceDesksService: ServiceDesksService,
    private readonly ticketStagesService: TicketStagesService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  create(@Body() createServiceDeskDto: CreateServiceDeskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.serviceDesksService.create(createServiceDeskDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceDesksService.findAll(user);
  }

  @Get('holidays/national/:year')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  importNationalHolidays(@Param('year') year: string) {
    return this.serviceDesksService.importNationalHolidays(Number(year));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceDesksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  update(
    @Param('id') id: string,
    @Body() updateServiceDeskDto: UpdateServiceDeskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serviceDesksService.update(id, updateServiceDeskDto, user.id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  remove(@Param('id') id: string) {
    return this.serviceDesksService.remove(id);
  }

  @Get(':id/business-hours')
  getBusinessHours(@Param('id') id: string) {
    return this.serviceDesksService.getBusinessHours(id);
  }

  @Get(':id/stages')
  listStages(@Param('id') id: string) {
    return this.ticketStagesService.list(id);
  }

  @Post(':id/stages')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  createStage(@Param('id') id: string, @Body() dto: CreateTicketStageDto) {
    return this.ticketStagesService.create(id, dto.name);
  }

  @Patch(':id/stages/reorder')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  reorderStages(@Param('id') id: string, @Body() dto: ReorderTicketStagesDto) {
    return this.ticketStagesService.reorder(id, dto.ids);
  }

  @Patch(':id/stages/:stageId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  updateStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateTicketStageDto,
  ) {
    return this.ticketStagesService.update(id, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  removeStage(@Param('id') id: string, @Param('stageId') stageId: string) {
    return this.ticketStagesService.remove(id, stageId);
  }

  @Put(':id/business-hours')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_DESKS')
  updateBusinessHours(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.serviceDesksService.updateBusinessHours(id, dto);
  }
}
