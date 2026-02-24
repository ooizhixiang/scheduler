import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a new location' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateLocationDto) {
    return this.locationService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all locations' })
  async findAll(@TenantId() tenantId: string) {
    return this.locationService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update location' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete location' })
  async remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.remove(tenantId, id);
  }
}
