// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const GetCurrentUser = createParamDecorator(
//   (data: string | undefined, context: ExecutionContext) => {
//     const request = context.switchToHttp().getRequest();
//     if (!data) return request.user;
//     return request.user[data];
//   },
// );

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!data) return user;

    const value = user?.[data];

    // Nếu field là 'id' thì tự động ép kiểu về number
    if (data === 'id' && typeof value === 'string') {
      const parsed = Number(value);
      return isNaN(parsed) ? value : parsed;
    }

    return value;
  },
);
