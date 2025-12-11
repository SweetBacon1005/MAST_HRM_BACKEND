import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { DatabaseModule } from '../database/database.module';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TeamController],
  providers: [TeamService, RoleAssignmentService, RoleHierarchyService],
  exports: [TeamService],
})
export class TeamModule {}
