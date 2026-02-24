import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a new department' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  async findAll(@TenantId() tenantId: string) {
    return this.departmentService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update department' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete department' })
  async remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.remove(tenantId, id);
  }
}
