import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MilestoneStatus } from '@prisma/client';

describe('Milestones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminToken: string;
  let employeeToken: string;
  let testProjectId: number;
  let testMilestoneId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test project
    const project = await prisma.projects.create({
      data: {
        name: 'E2E Test Project',
        code: 'E2E-TEST',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        status: 'OPEN',
      },
    });
    testProjectId = project.id;

    // Login as admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password',
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.access_token;
      authToken = adminToken;
    }

    // Login as employee
    const employeeLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'employee@example.com',
        password: 'password',
      });

    if (employeeLoginResponse.status === 200) {
      employeeToken = employeeLoginResponse.body.access_token;
    }
  }

  async function cleanupTestData() {
    if (testProjectId) {
      await prisma.project_milestones.deleteMany({
        where: { project_id: testProjectId },
      });
      await prisma.projects.delete({
        where: { id: testProjectId },
      });
    }
  }

  describe('/milestones/projects/:projectId (POST)', () => {
    it('should create a milestone with valid data (Admin)', () => {
      const createDto = {
        name: 'Phase 1 - Planning',
        description: 'Initial planning and requirement gathering',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        status: MilestoneStatus.PENDING,
        progress: 0,
        order: 1,
      };

      return request(app.getHttpServer())
        .post(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(createDto.name);
          expect(response.body.project_id).toBe(testProjectId);
          testMilestoneId = response.body.id;
        });
    });

    it('should return 400 if start date is after end date', () => {
      const invalidDto = {
        name: 'Invalid Milestone',
        start_date: '2024-05-01',
        end_date: '2024-03-31',
      };

      return request(app.getHttpServer())
        .post(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 if milestone is out of project range', () => {
      const invalidDto = {
        name: 'Out of Range Milestone',
        start_date: '2023-11-01',
        end_date: '2023-12-31',
      };

      return request(app.getHttpServer())
        .post(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 403 if user does not have permission (Employee)', () => {
      const createDto = {
        name: 'Unauthorized Milestone',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
      };

      return request(app.getHttpServer())
        .post(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should return 404 if project does not exist', () => {
      const createDto = {
        name: 'Milestone for Non-existent Project',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
      };

      return request(app.getHttpServer())
        .post('/milestones/projects/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(404);
    });
  });

  describe('/milestones/projects/:projectId (GET)', () => {
    it('should get all milestones for a project', () => {
      return request(app.getHttpServer())
        .get(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });

    it('should allow employee to view milestones (read permission)', () => {
      return request(app.getHttpServer())
        .get(`/milestones/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    });
  });

  describe('/milestones/:id (GET)', () => {
    it('should get milestone details', () => {
      return request(app.getHttpServer())
        .get(`/milestones/${testMilestoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', testMilestoneId);
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('project');
        });
    });

    it('should return 404 for non-existent milestone', () => {
      return request(app.getHttpServer())
        .get('/milestones/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/milestones (GET)', () => {
    it('should get paginated milestones', () => {
      return request(app.getHttpServer())
        .get('/milestones?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('meta');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('should filter milestones by project_id', () => {
      return request(app.getHttpServer())
        .get(`/milestones?project_id=${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.every(
            (m: any) => m.project_id === testProjectId,
          )).toBe(true);
        });
    });

    it('should filter milestones by status', () => {
      return request(app.getHttpServer())
        .get(`/milestones?status=${MilestoneStatus.PENDING}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.every(
            (m: any) => m.status === MilestoneStatus.PENDING,
          )).toBe(true);
        });
    });
  });

  describe('/milestones/:id (PATCH)', () => {
    it('should update milestone', () => {
      const updateDto = {
        name: 'Phase 1 - Planning (Updated)',
        progress: 50,
        status: MilestoneStatus.IN_PROGRESS,
      };

      return request(app.getHttpServer())
        .patch(`/milestones/${testMilestoneId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.name).toBe(updateDto.name);
          expect(response.body.progress).toBe(updateDto.progress);
          expect(response.body.status).toBe(updateDto.status);
        });
    });

    it('should return 403 if employee tries to update', () => {
      const updateDto = {
        name: 'Updated by Employee',
      };

      return request(app.getHttpServer())
        .patch(`/milestones/${testMilestoneId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('/milestones/:id/progress (PATCH)', () => {
    it('should update milestone progress', () => {
      const progressDto = {
        progress: 75,
      };

      return request(app.getHttpServer())
        .patch(`/milestones/${testMilestoneId}/progress`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(progressDto)
        .expect(200)
        .then((response) => {
          expect(response.body.progress).toBe(75);
        });
    });

    it('should return 400 if progress is out of range', () => {
      return request(app.getHttpServer())
        .patch(`/milestones/${testMilestoneId}/progress`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ progress: 150 })
        .expect(400);
    });
  });

  describe('/milestones/:id (DELETE)', () => {
    it('should soft delete milestone', () => {
      return request(app.getHttpServer())
        .delete(`/milestones/${testMilestoneId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('deleted_at');
        });
    });

    it('should return 403 if employee tries to delete', async () => {
      // Create a new milestone to delete
      const newMilestone = await prisma.project_milestones.create({
        data: {
          project_id: testProjectId,
          name: 'To Be Deleted by Employee Test',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-03-31'),
          status: MilestoneStatus.PENDING,
          progress: 0,
          order: 2,
        },
      });

      return request(app.getHttpServer())
        .delete(`/milestones/${newMilestone.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent milestone', () => {
      return request(app.getHttpServer())
        .delete('/milestones/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Project Progress Calculation', () => {
    beforeAll(async () => {
      // Clean existing milestones
      await prisma.project_milestones.deleteMany({
        where: { project_id: testProjectId },
      });

      // Create 3 milestones with different progress
      await prisma.project_milestones.createMany({
        data: [
          {
            project_id: testProjectId,
            name: 'Milestone 1',
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-03-31'),
            status: MilestoneStatus.COMPLETED,
            progress: 100,
            order: 1,
          },
          {
            project_id: testProjectId,
            name: 'Milestone 2',
            start_date: new Date('2024-04-01'),
            end_date: new Date('2024-06-30'),
            status: MilestoneStatus.IN_PROGRESS,
            progress: 60,
            order: 2,
          },
          {
            project_id: testProjectId,
            name: 'Milestone 3',
            start_date: new Date('2024-07-01'),
            end_date: new Date('2024-09-30'),
            status: MilestoneStatus.PENDING,
            progress: 0,
            order: 3,
          },
        ],
      });
    });

    it('should calculate project progress from milestones', () => {
      return request(app.getHttpServer())
        .get(`/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          // (100 + 60 + 0) / 3 = 53.33 => 53
          expect(response.body.progress).toBe(53);
        });
    });
  });
});
