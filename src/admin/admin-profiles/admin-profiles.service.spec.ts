import { Test, TestingModule } from '@nestjs/testing';
import { AdminProfilesService } from './admin-profiles.service';

describe('AdminProfilesService', () => {
  let service: AdminProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminProfilesService],
    }).compile();

    service = module.get<AdminProfilesService>(AdminProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
