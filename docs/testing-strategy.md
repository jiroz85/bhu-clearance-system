# BHU Clearance System - Comprehensive Testing Strategy

## Current Testing State

### ✅ Already Implemented
- Basic Jest configuration
- NestJS testing setup
- One integration test (`workflow.integration.spec.ts`)

### ❌ Critical Testing Gaps

## 1. **Testing Architecture Overview**

### 1.1 **Test Pyramid Strategy**
```
    E2E Tests (10%)
   ─────────────────
  Integration Tests (20%)
 ─────────────────────────
Unit Tests (70%)
```

### 1.2 **Test Categories**
- **Unit Tests**: Individual functions, services, utilities
- **Integration Tests**: API endpoints, database operations, auth flows
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Load testing, stress testing
- **Security Tests**: Penetration testing, vulnerability scanning

## 2. **Unit Testing Strategy**

### 2.1 **Service Layer Tests**
```typescript
// Example: Clearance Service Tests
describe('ClearanceService', () => {
  let service: ClearanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ClearanceService, PrismaService],
    }).compile();

    service = module.get<ClearanceService>(ClearanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('submitClearance', () => {
    it('should submit clearance successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockClearance = { id: 'clearance-123', status: 'SUBMITTED' };
      jest.spyOn(prisma.clearance, 'create').mockResolvedValue(mockClearance);

      // Act
      const result = await service.submitClearance(userId);

      // Assert
      expect(result).toEqual(mockClearance);
      expect(prisma.clearance.create).toHaveBeenCalledWith({
        data: {
          studentUserId: userId,
          status: 'SUBMITTED',
          // ... other required fields
        }
      });
    });

    it('should throw error if user already has active clearance', async () => {
      // Arrange
      const userId = 'user-123';
      jest.spyOn(prisma.clearance, 'findFirst').mockResolvedValue({} as any);

      // Act & Assert
      await expect(service.submitClearance(userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('approveStep', () => {
    it('should approve step if previous step is approved', async () => {
      // Test strict workflow enforcement
    });

    it('should reject step approval if previous step is pending', async () => {
      // Test workflow order validation
    });
  });
});
```

### 2.2 **Controller Tests**
```typescript
// Example: Auth Controller Tests
describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            logout: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      // Arrange
      const loginDto = { email: 'test@bhu.edu', password: 'password123' };
      const mockResponse = { accessToken: 'jwt-token', refreshToken: 'refresh-token' };
      jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@bhu.edu', password: 'wrong-password' };
      jest.spyOn(authService, 'login').mockRejectedValue(new UnauthorizedException());

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 2.3 **Utility & Helper Tests**
```typescript
// Example: Password Utility Tests
describe('PasswordUtils', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hash = await PasswordUtils.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await PasswordUtils.hashPassword(password);
      const hash2 = await PasswordUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const password = 'testPassword123';
      const hash = await PasswordUtils.hashPassword(password);

      const isValid = await PasswordUtils.validatePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await PasswordUtils.hashPassword(password);

      const isValid = await PasswordUtils.validatePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
});
```

## 3. **Integration Testing Strategy**

### 3.1 **API Endpoint Tests**
```typescript
// Example: Clearance API Integration Tests
describe('Clearance API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.clearance.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/api/clearances (POST)', () => {
    it('should create clearance request', async () => {
      // Arrange
      const user = await createTestUser(prisma);
      const token = await generateTestToken(user);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/clearances')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        studentUserId: user.id,
        status: 'DRAFT',
      });
    });
  });

  describe('/api/clearances/:id/steps/:stepOrder (PATCH)', () => {
    it('should approve step in correct order', async () => {
      // Test workflow enforcement
    });

    it('should reject step out of order', async () => {
      // Test strict order validation
    });
  });
});
```

### 3.2 **Database Integration Tests**
```typescript
// Example: Database Integration Tests
describe('Database Integration', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Clearance Workflow', () => {
    it('should enforce strict step order', async () => {
      // Create test data
      const user = await createTestUser(prisma);
      const clearance = await createTestClearance(prisma, user.id);
      
      // Try to approve step 2 before step 1
      await expect(
        prisma.clearanceStep.update({
          where: {
            clearanceId_stepOrder: {
              clearanceId: clearance.id,
              stepOrder: 2
            }
          },
          data: { status: 'APPROVED' }
        })
      ).rejects.toThrow();
    });

    it('should update clearance status when all steps approved', async () => {
      // Test automatic status updates
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for sensitive actions', async () => {
      // Test audit trail creation
    });
  });
});
```

## 4. **End-to-End Testing Strategy**

### 4.1 **User Workflow Tests**
```typescript
// Example: Playwright E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Student Clearance Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'student@bhu.edu');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await page.waitForURL('/dashboard');
  });

  test('complete clearance workflow', async ({ page }) => {
    // Start clearance
    await page.click('[data-testid=start-clearance]');
    await expect(page.locator('[data-testid=clearance-status]')).toContainText('IN_PROGRESS');

    // Check department steps
    await page.click('[data-testid=view-steps]');
    const steps = page.locator('[data-testid=step-item]');
    await expect(steps).toHaveCount(13);

    // Verify first step is unlocked, others are locked
    await expect(steps.first()).toHaveClass(/unlocked/);
    await expect(steps.nth(1)).toHaveClass(/locked/);
  });

  test('view clearance certificate after completion', async ({ page }) => {
    // Mock completed clearance
    await mockCompletedClearance(page);

    // Navigate to certificates
    await page.click('[data-testid=certificates-tab]');
    await page.click('[data-testid=download-certificate]');

    // Verify PDF download
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/certificate.*\.pdf/);
  });
});

test.describe('Staff Review Flow', () => {
  test('review pending clearance requests', async ({ page }) => {
    // Login as staff
    await loginAsStaff(page, 'library');

    // View pending requests
    await page.goto('/staff/dashboard');
    await expect(page.locator('[data-testid=pending-requests]')).toBeVisible();

    // Review first request
    await page.click('[data-testid=request-item]:first-child');
    await page.click('[data-testid=approve-button]');
    await page.fill('[data-testid=comment]', 'All books returned');
    await page.click('[data-testid=submit-review]');

    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
  });
});
```

### 4.2 **Cross-Browser Testing**
```typescript
// Browser matrix testing
const browsers = [
  { name: 'Chrome', channel: 'chrome' },
  { name: 'Firefox', channel: 'firefox' },
  { name: 'Safari', channel: 'webkit' },
  { name: 'Edge', channel: 'msedge' }
];

browsers.forEach(browser => {
  test.describe(`Clearance Flow - ${browser.name}`, () => {
    test.use({ ...browser });

    test('complete workflow', async ({ page }) => {
      // Run same E2E tests across browsers
    });
  });
});
```

## 5. **Performance Testing Strategy**

### 5.1 **Load Testing**
```typescript
// Example: K6 Load Test
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up to 100 users
    { duration: '5m', target: 100 }, // stay at 100 users
    { duration: '2m', target: 200 }, // ramp up to 200 users
    { duration: '5m', target: 200 }, // stay at 200 users
    { duration: '2m', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // error rate under 10%
    errors: ['rate<0.1'],
  },
};

export default function() {
  // Test login endpoint
  let loginResponse = http.post(`${__ENV.BASE_URL}/api/auth/login`, {
    email: 'test@bhu.edu',
    password: 'password123'
  });
  
  let loginOk = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!loginOk);

  // Test dashboard endpoint
  if (loginResponse.json('accessToken')) {
    let dashboardResponse = http.get(`${__ENV.BASE_URL}/api/student/dashboard`, {
      headers: {
        Authorization: `Bearer ${loginResponse.json('accessToken')}`
      }
    });

    let dashboardOk = check(dashboardResponse, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!dashboardOk);
  }

  sleep(1);
}
```

### 5.2 **Stress Testing**
```typescript
// Database stress test
describe('Database Stress Tests', () => {
  it('handle concurrent clearance requests', async () => {
    const concurrentRequests = 100;
    const promises = Array.from({ length: concurrentRequests }, () =>
      createClearanceRequest(testUser.id)
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    expect(successful).toBeGreaterThan(95); // 95% success rate
    expect(failed).toBeLessThan(5);
  });

  it('maintain performance under load', async () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      await service.getClearanceDashboard(testUser.id);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 1000;
    
    expect(avgTime).toBeLessThan(100); // < 100ms per request
  });
});
```

## 6. **Security Testing Strategy**

### 6.1 **Authentication Security Tests**
```typescript
describe('Authentication Security', () => {
  it('prevent brute force attacks', async () => {
    const email = 'test@bhu.edu';
    
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    }

    // Account should be locked
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'correct-password' })
      .expect(423); // Locked
  });

  it('prevent JWT token manipulation', async () => {
    const token = generateTestToken(testUser);
    const manipulatedToken = token.slice(0, -10) + ' manipulated';

    await request(app.getHttpServer())
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${manipulatedToken}`)
      .expect(401);
  });

  it('enforce session management', async () => {
    // Test concurrent sessions
    // Test session revocation
    // Test refresh token rotation
  });
});
```

### 6.2 **Authorization Security Tests**
```typescript
describe('Authorization Security', () => {
  it('prevent privilege escalation', async () => {
    const studentToken = await generateTestToken(studentUser);
    
    // Try to access admin endpoint
    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('prevent cross-department access', async () => {
    const libraryStaffToken = await generateTestToken(libraryStaff);
    
    // Try to access finance department data
    await request(app.getHttpServer())
      .get('/api/staff/finance/pending')
      .set('Authorization', `Bearer ${libraryStaffToken}`)
      .expect(403);
  });

  it('prevent data access bypass', async () => {
    const student1Token = await generateTestToken(student1);
    
    // Try to access student2's data
    await request(app.getHttpServer())
      .get(`/api/student/${student2.id}/dashboard`)
      .set('Authorization', `Bearer ${student1Token}`)
      .expect(403);
  });
});
```

## 7. **Test Data Management**

### 7.1 **Test Data Factory**
```typescript
// Test data factory
export class TestDataFactory {
  static async createUser(overrides?: Partial<User>): Promise<User> {
    return prisma.user.create({
      data: {
        email: faker.internet.email(),
        passwordHash: await hashPassword('password123'),
        role: 'STUDENT',
        displayName: faker.person.fullName(),
        ...overrides
      }
    });
  }

  static async createClearance(userId: string, overrides?: Partial<Clearance>): Promise<Clearance> {
    return prisma.clearance.create({
      data: {
        studentUserId: userId,
        referenceId: `CLR-${Date.now()}`,
        status: 'DRAFT',
        ...overrides
      }
    });
  }

  static async createClearanceSteps(clearanceId: string): Promise<ClearanceStep[]> {
    const steps = [];
    for (let i = 1; i <= 13; i++) {
      steps.push({
        clearanceId,
        stepOrder: i,
        department: `Department ${i}`,
        status: 'PENDING'
      });
    }
    return prisma.clearanceStep.createMany({ data: steps });
  }
}
```

### 7.2 **Database Cleanup**
```typescript
// Test database cleanup
export class TestDatabase {
  static async cleanup() {
    // Delete in order of dependencies
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.review.deleteMany();
    await prisma.clearanceStep.deleteMany();
    await prisma.clearance.deleteMany();
    await prisma.user.deleteMany();
  }

  static async seed() {
    // Create test data for integration tests
    const departments = await this.createDepartments();
    const users = await this.createUsers();
    return { departments, users };
  }
}
```

## 8. **Continuous Integration Testing**

### 8.1 **GitHub Actions Workflow**
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run test:security
```

## 9. **Test Coverage Requirements**

### 9.1 **Coverage Targets**
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "./src/auth/": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    },
    "./src/clearance/": {
      "branches": 85,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

### 9.2 **Critical Path Coverage**
- Authentication flows: 100%
- Clearance workflow: 95%
- Authorization checks: 100%
- Data validation: 90%
- Error handling: 85%

## 10. **Testing Best Practices**

### 10.1 **Test Organization**
```
tests/
├── unit/
│   ├── services/
│   ├── controllers/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   ├── workflows/
│   └── cross-browser/
├── performance/
│   ├── load/
│   └── stress/
└── security/
    ├── auth/
    └── authorization/
```

### 10.2 **Test Naming Conventions**
```typescript
// Good test names
describe('ClearanceService.submitClearance', () => {
  it('should create clearance request for eligible student', () => {});
  it('should throw error if student has active clearance', () => {});
  it('should initialize all 13 steps as pending', () => {});
});

// Bad test names
describe('ClearanceService', () => {
  it('works', () => {});
  it('test1', () => {});
  it('should work correctly', () => {});
});
```

### 10.3 **Test Maintenance**
- Regular test refactoring
- Remove flaky tests
- Update test data with schema changes
- Monitor test execution times
- Review coverage reports monthly

This comprehensive testing strategy ensures the BHU Clearance System meets enterprise-grade quality standards and maintains reliability throughout its lifecycle.
