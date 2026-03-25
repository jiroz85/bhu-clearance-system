import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClearanceService } from './clearance/clearance.service';

jest.mock('./clearance/clearance.service', () => ({
  ClearanceService: class {
    getWorkflow() {
      return Array.from({ length: 13 }, (_, i) => ({ stepOrder: i + 1, department: `D${i}` }));
    }
  },
}));

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ClearanceService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return API health payload', () => {
      const res = appController.health();
      expect(res.status).toBe('ok');
      expect(res.name).toContain('BHU');
    });
  });

  describe('workflow', () => {
    it('should return 13 workflow steps', () => {
      const wf = appController.workflow();
      expect(wf).toHaveLength(13);
    });
  });
});
