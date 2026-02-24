import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { GroupService } from './group.service';
import { CreateGroupDto, UpdateGroupDto, UpdateGroupMembersDto } from './dto';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Create a new group' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateGroupDto) {
    return this.groupService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  async findAll(@TenantId() tenantId: string) {
    return this.groupService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Update group' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete group' })
  async remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.remove(tenantId, id);
  }

  @Post(':id/members')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Set group members (replaces existing)' })
  async setMembers(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupMembersDto,
  ) {
    return this.groupService.setMembers(tenantId, id, dto.employeeIds);
  }
}
