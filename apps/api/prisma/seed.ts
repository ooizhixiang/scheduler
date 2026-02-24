import { PrismaClient, SystemRole, EmploymentType, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Seeding database...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { tenantId: DEFAULT_TENANT_ID },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      companyName: 'Scheduler Demo',
      timezone: 'America/New_York',
      workWeekStartDay: 1,
      defaultShiftDuration: 8,
      maxOvertimeHoursPerWeek: 10,
      setupComplete: true,
    },
  });
  console.log('  - Company settings created');

  // 2. Super Admin
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.employee.upsert({
    where: { tenantId_email: { tenantId: DEFAULT_TENANT_ID, email: 'admin@scheduler.local' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      email: 'admin@scheduler.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      systemRole: SystemRole.SUPER_ADMIN,
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: new Date(),
    },
  });
  console.log('  - Super Admin created (admin@scheduler.local / Admin123!)');

  // 3. Sample Departments
  const engineering = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name: 'Engineering' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      name: 'Engineering',
    },
  });

  const operations = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name: 'Operations' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      name: 'Operations',
    },
  });
  console.log('  - Sample departments created');

  // 4. Sample Roles
  await prisma.role.upsert({
    where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name: 'Barista' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      name: 'Barista',
      shortCode: 'BAR',
      color: '#f59e0b',
      description: 'Coffee preparation and customer service',
    },
  });

  await prisma.role.upsert({
    where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name: 'Shift Lead' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      name: 'Shift Lead',
      shortCode: 'SL',
      color: '#10b981',
      description: 'Supervises shift operations',
    },
  });

  await prisma.role.upsert({
    where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name: 'Cashier' } },
    update: {},
    create: {
      tenantId: DEFAULT_TENANT_ID,
      name: 'Cashier',
      shortCode: 'CSH',
      color: '#6366f1',
      description: 'Handles register and transactions',
    },
  });
  console.log('  - Sample roles created');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
