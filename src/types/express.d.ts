import { ScopeType } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      roles?: string[]; // Tất cả role names đã sắp xếp theo thứ tự ưu tiên (cao -> thấp)
    }
  }
}

export {};
