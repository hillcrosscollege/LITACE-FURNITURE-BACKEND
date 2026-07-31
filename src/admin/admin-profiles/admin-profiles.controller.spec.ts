import { Test, TestingModule } from '@nestjs/testing';
import { AdminProfilesController } from './admin-profiles.controller';

describe('AdminProfilesController', () => {
  let controller: AdminProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProfilesController],
    }).compile();

    controller = module.get<AdminProfilesController>(AdminProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
