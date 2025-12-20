import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  async (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    let user = request.user;

    if (!user) {
      return undefined;
    }

    if (!data) {
      return user;
    }

    if (data === 'roles' && !user.roleContexts) {
      return [];
    }

    const value = user?.[data];

    if (data === 'id' && typeof value === 'string') {
      const parsed = Number(value);
      return isNaN(parsed) ? value : parsed;
    }

    if (data === 'roles' && user.roleContexts) {
      return user.roleContexts.map((rc: any) => rc.roleName);
    }

    return value;
  },
);
