import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto, AssignRolesDto, EmployeeListQueryDto } from './dto';
import { Roles, CurrentUser, TenantId } from '../../common/decorators';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a new employee (sends invite email)' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(tenantId, dto);
  }

  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'List employees with pagination, search, and filters' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: EmployeeListQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.findAll(tenantId, query, {
      systemRole: user.systemRole,
      departmentId: user.departmentId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(tenantId, id, dto);
  }

  @Post(':id/archive')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Archive an employee' })
  async archive(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.archive(tenantId, id);
  }

  @Post(':id/reactivate')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Reactivate an archived employee' })
  async reactivate(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.reactivate(tenantId, id);
  }

  @Post(':id/resend-invite')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Resend invitation email to an employee' })
  async resendInvite(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.resendInvite(tenantId, id);
  }

  @Post(':id/roles')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Assign roles to an employee' })
  async assignRoles(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.employeeService.assignRoles(tenantId, id, dto.roleIds);
  }

  @Get(':id/sessions')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List active sessions for an employee' })
  async getSessions(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.getSessions(tenantId, id);
  }

  @Delete(':id/sessions/:sessionId')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.employeeService.revokeSession(tenantId, id, sessionId);
  }

  @Delete(':id/sessions')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke all sessions for an employee' })
  async revokeAllSessions(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeeService.revokeAllSessions(tenantId, id);
  }
}
