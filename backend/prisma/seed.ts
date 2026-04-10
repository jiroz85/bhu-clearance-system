import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

const BCRYPT_ROUNDS = 12;

const WORKFLOW_DEPARTMENTS = [
  'Department head',
  'Library',
  'University Book store',
  'Dormitory',
  'Student Cafeteria Service',
  'Sport Master',
  'University police',
  'Office of the student Dean',
  'e-Learning Management directorate',
  'College Continues Education Program Coordinator',
  'Finance Administration',
  'Office of the cost sharing',
  'College Registrar Coordinator',
];

function deriveDepartmentCode(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function deriveStepCode(stepOrder: number, departmentCode: string) {
  return `STEP_${String(stepOrder).padStart(2, '0')}_${departmentCode}`.slice(
    0,
    64,
  );
}

function deriveStepName(departmentName: string) {
  return departmentName;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seed');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@bhu.edu.et';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe_Admin123!';
  const studentEmail = process.env.SEED_STUDENT_EMAIL ?? 'student@bhu.edu.et';
  const studentPassword =
    process.env.SEED_STUDENT_PASSWORD ?? 'ChangeMe_Student123!';
  const libraryEmail = process.env.SEED_LIBRARY_EMAIL ?? 'library@bhu.edu.et';
  const libraryPassword =
    process.env.SEED_LIBRARY_PASSWORD ?? 'ChangeMe_Library123!';
  const deptHeadEmail =
    process.env.SEED_DEPT_HEAD_EMAIL ?? 'depthead@bhu.edu.et';
  const deptHeadPassword =
    process.env.SEED_DEPT_HEAD_PASSWORD ?? 'ChangeMe_DeptHead123!';

  const university = await prisma.university.upsert({
    where: { code: 'BHU' },
    update: { name: 'Bule Hora University', isActive: true },
    create: { code: 'BHU', name: 'Bule Hora University', isActive: true },
  });

  // Seed departments + ordered workflow (DB-driven workflow for production)
  const workflow = await prisma.clearanceWorkflow.upsert({
    where: {
      name_version: { name: 'BHU Standard Exit Clearance', version: 1 },
    },
    update: {},
    create: {
      universityId: university.id,
      name: 'BHU Standard Exit Clearance',
      version: 1,
      isActive: true,
    },
  });

  const departments = await Promise.all(
    WORKFLOW_DEPARTMENTS.map(async (departmentName) => {
      const code = deriveDepartmentCode(departmentName);
      const dep = await prisma.department.upsert({
        where: { name: departmentName },
        update: {},
        create: {
          universityId: university.id,
          code,
          name: departmentName,
          isActive: true,
        },
      });
      return dep;
    }),
  );

  // Create workflow steps in strict 1..13 order
  for (let i = 0; i < WORKFLOW_DEPARTMENTS.length; i += 1) {
    const stepOrder = i + 1;
    const departmentName = WORKFLOW_DEPARTMENTS[i];
    const department = departments.find((d) => d.name === departmentName);
    if (!department) continue;

    await prisma.workflowStep.upsert({
      where: { workflowId_stepOrder: { workflowId: workflow.id, stepOrder } },
      update: {},
      create: {
        workflowId: workflow.id,
        universityId: university.id,
        stepOrder,
        departmentId: department.id,
        stepCode: deriveStepCode(stepOrder, department.code),
        stepName: deriveStepName(departmentName),
        isRequired: true,
      },
    });
  }

  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  const studentHash = await bcrypt.hash(studentPassword, BCRYPT_ROUNDS);
  const libraryHash = await bcrypt.hash(libraryPassword, BCRYPT_ROUNDS);
  const deptHeadHash = await bcrypt.hash(deptHeadPassword, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      universityId: university.id,
      passwordHash: adminHash,
      role: Role.ADMIN,
      displayName: 'Registrar Admin',
    },
    update: {
      passwordHash: adminHash,
      universityId: university.id,
      role: Role.ADMIN,
      displayName: 'Registrar Admin',
    },
  });

  await prisma.user.upsert({
    where: { email: studentEmail.toLowerCase() },
    create: {
      email: studentEmail.toLowerCase(),
      universityId: university.id,
      passwordHash: studentHash,
      role: Role.STUDENT,
      displayName: 'Demo Student',
      studentUniversityId: 'BHU123456',
      studentDepartment: 'Computer Science',
      studentYear: '4',
    },
    update: {
      passwordHash: studentHash,
      universityId: university.id,
      role: Role.STUDENT,
      displayName: 'Demo Student',
      studentUniversityId: 'BHU123456',
      studentDepartment: 'Computer Science',
      studentYear: '4',
    },
  });

  await prisma.user.upsert({
    where: { email: libraryEmail.toLowerCase() },
    create: {
      email: libraryEmail.toLowerCase(),
      universityId: university.id,
      passwordHash: libraryHash,
      role: Role.STAFF,
      displayName: 'Library Desk',
      staffDepartment: 'Library',
    },
    update: {
      passwordHash: libraryHash,
      universityId: university.id,
      role: Role.STAFF,
      displayName: 'Library Desk',
      staffDepartment: 'Library',
    },
  });

  await prisma.user.upsert({
    where: { email: deptHeadEmail.toLowerCase() },
    create: {
      email: deptHeadEmail.toLowerCase(),
      universityId: university.id,
      passwordHash: deptHeadHash,
      role: Role.STAFF,
      displayName: 'Department Head Desk',
      staffDepartment: 'Department head',
    },
    update: {
      passwordHash: deptHeadHash,
      universityId: university.id,
      role: Role.STAFF,
      displayName: 'Department Head Desk',
      staffDepartment: 'Department head',
    },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
