import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_NAMES } from '../constants/role.constants';
import { PermissionService } from './permission.service';

export interface RoleHierarchy {
  level: number;
  name: string;
  canManage: string[];
}

@Injectable()
export class RoleHierarchyService {
  constructor(
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly roleHierarchy: RoleHierarchy[] = [
    {
      level: 1,
      name: ROLE_NAMES.EMPLOYEE,
      canManage: [],
    },
    {
      level: 2,
      name: ROLE_NAMES.TEAM_LEADER,
      canManage: [ROLE_NAMES.EMPLOYEE],
    },
    {
      level: 3,
      name: ROLE_NAMES.DIVISION_HEAD,
      canManage: [ROLE_NAMES.EMPLOYEE, ROLE_NAMES.TEAM_LEADER],
    },
    {
      level: 4,
      name: ROLE_NAMES.PROJECT_MANAGER,
      canManage: [ROLE_NAMES.EMPLOYEE, ROLE_NAMES.TEAM_LEADER],
    },
    {
      level: 5,
      name: ROLE_NAMES.HR_MANAGER,
      canManage: [
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
      ],
    },
    {
      level: 7,
      name: ROLE_NAMES.ADMIN,
      canManage: [
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.HR_MANAGER,
      ],
    },
  ];
  Hierarchy(roleName: string): RoleHierarchy | null {
    return this.roleHierarchy.find((role) => role.name === roleName) || null;
  }
}
