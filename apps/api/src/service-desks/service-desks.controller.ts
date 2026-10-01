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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('service-desks')
@UseGuards(JwtAuthGuard)
export class ServiceDesksController {
  constructor(private readonly serviceDesksService: ServiceDesksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createServiceDeskDto: CreateServiceDeskDto) {
    return this.serviceDesksService.create(createServiceDeskDto);
  }

  @Get()
  findAll() {
    return this.serviceDesksService.findAll();
  }

  @Get('holidays/national/:year')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT_MASTER)
  importNationalHolidays(@Param('year') year: string) {
    return this.serviceDesksService.importNationalHolidays(Number(year));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceDesksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateServiceDeskDto: UpdateServiceDeskDto,
  ) {
    return this.serviceDesksService.update(id, updateServiceDeskDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.serviceDesksService.remove(id);
  }

  @Get(':id/business-hours')
  getBusinessHours(@Param('id') id: string) {
    return this.serviceDesksService.getBusinessHours(id);
  }

  @Put(':id/business-hours')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT_MASTER)
  updateBusinessHours(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.serviceDesksService.updateBusinessHours(id, dto);
  }
}
