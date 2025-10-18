# 🔐 Hướng dẫn triển khai hệ thống phân quyền

## 📋 Tổng quan

Hệ thống phân quyền đã được triển khai hoàn chỉnh với:

- **7 roles** phù hợp với cơ cấu tổ chức
- **42 permissions** chi tiết theo modules
- **185 permission-role assignments** được tối ưu hóa
- **Guards, Decorators, Services** đầy đủ

## 🎯 Cấu trúc hệ thống

### **1. Core Components**

#### **Decorators**

```typescript
// src/auth/decorators/require-permission.decorator.ts
@RequirePermission('user.create')           // Single permission
@RequireAnyPermission(['user.read', 'user.update'])  // OR logic
@RequireAllPermissions(['user.read', 'user.update']) // AND logic
```

#### **Guards**

```typescript
// src/auth/guards/permission.guard.ts
@UseGuards(JwtAuthGuard, PermissionGuard)
```

#### **Services**

```typescript
// src/auth/services/permission.service.ts - Core logic
// src/auth/services/permission-helper.service.ts - Helper methods
```

#### **Middleware & Interceptors**

```typescript
// src/auth/middleware/permission.middleware.ts - Request logging
// src/auth/interceptors/permission-logging.interceptor.ts - Access logging
```

### **2. Roles & Permissions Matrix**

| Role                | User Mgmt  | Project   | Timesheet  | Attendance | Leave      | Request    | Report    | Organization |
| ------------------- | ---------- | --------- | ---------- | ---------- | ---------- | ---------- | --------- | ------------ |
| **super_admin**     | ✅ Full    | ✅ Full   | ✅ Full    | ✅ Full    | ✅ Full    | ✅ Full    | ✅ Full   | ✅ Full      |
| **admin**           | ✅ Full    | ✅ Full   | ✅ Full    | ✅ Full    | ✅ Full    | ✅ Full    | ✅ Full   | ✅ Manage    |
| **hr_manager**      | ✅ Manage  | 👁️ Read   | 📊 Stats   | ✅ Manage  | ✅ Manage  | ✅ Approve | ✅ Export | ✅ Manage    |
| **project_manager** | 👁️ Read    | ✅ Manage | ✅ Approve | 📊 Stats   | ✅ Approve | ✅ Approve | ✅ Full   | 👁️ Read      |
| **division_head**   | 📝 Update  | 📝 Assign | ✅ Approve | ✅ Manage  | ✅ Approve | ✅ Approve | ✅ Export | ✅ Manage    |
| **team_leader**     | 👁️ Read    | 📝 Update | ✅ Approve | 👁️ Basic   | ✅ Approve | ✅ Approve | 👁️ Read   | 📝 Team      |
| **employee**        | 👁️ Profile | 👁️ Read   | 📝 Basic   | 👁️ Checkin | 📝 Create  | 📝 Create  | ❌ None   | 👁️ Read      |

## 🚀 Cách sử dụng

### **1. Áp dụng phân quyền cho Controller**

#### **Basic Usage**

```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard) // Bắt buộc cả 2 guards
@ApiBearerAuth('JWT-auth')
export class UsersController {
  @Post()
  @RequirePermission('user.create')
  @ApiOperation({ summary: 'Tạo user mới' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: 'Cập nhật user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @ApiOperation({ summary: 'Xóa user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

#### **Advanced Usage**

```typescript
export class RequestsController {

  // Cho phép nhiều permissions (OR logic)
  @Get('my/all')
  @RequireAnyPermission(['request.read', 'request.approve'])
  @ApiOperation({ summary: 'Lấy requests của tôi' })
  getMyRequests() { ... }

  // Yêu cầu tất cả permissions (AND logic)
  @Post('bulk-approve')
  @RequireAllPermissions(['request.approve', 'request.reject'])
  @ApiOperation({ summary: 'Duyệt hàng loạt' })
  bulkApprove() { ... }

  // Kiểm tra điều kiện phức tạp trong service
  @Post(':id/approve')
  @RequirePermission('request.approve')
  async approveRequest(
    @Param('id') id: string,
    @GetCurrentUser('id') approverId: number
  ) {
    // Logic kiểm tra thêm trong service
    return this.requestsService.approve(+id, approverId);
  }
}
```

### **2. Sử dụng PermissionService trong Business Logic**

```typescript
@Injectable()
export class RequestsService {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly permissionHelper: PermissionHelperService,
  ) {}

  async approveRequest(requestId: number, approverId: number) {
    const request = await this.findOne(requestId);

    // Kiểm tra không thể tự duyệt request của mình
    const canApprove = await this.permissionHelper.canApproveUserRequest(
      approverId,
      request.user_id,
    );

    if (!canApprove) {
      throw new ForbiddenException('Không thể tự duyệt request của mình');
    }

    // Logic approve...
  }

  async getStatistics(userId: number) {
    // Kiểm tra quyền xem thống kê
    const canViewStats = await this.permissionHelper.canViewStatistics(userId);

    if (!canViewStats) {
      throw new ForbiddenException('Không có quyền xem thống kê');
    }

    // Return statistics...
  }

  async getUserData(currentUserId: number, targetUserId: number) {
    // Kiểm tra quyền truy cập data của user khác
    const canAccess = await this.permissionHelper.canAccessUserResource(
      currentUserId,
      targetUserId,
      'user.read',
    );

    if (!canAccess) {
      throw new ForbiddenException('Không có quyền truy cập dữ liệu user này');
    }

    // Return user data...
  }
}
```

### **3. Sử dụng PermissionHelperService**

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly permissionHelper: PermissionHelperService) {}

  async checkUserCapabilities(userId: number) {
    // Kiểm tra các quyền cơ bản
    const canManageUsers = await this.permissionHelper.canManageUsers(userId);
    const canManageProjects =
      await this.permissionHelper.canManageProjects(userId);
    const canViewStatistics =
      await this.permissionHelper.canViewStatistics(userId);
    const isManager = await this.permissionHelper.isManagerLevel(userId);

    // Lấy permissions được nhóm theo category
    const groupedPermissions =
      await this.permissionHelper.getGroupedPermissions(userId);

    // Lấy menu permissions cho frontend
    const menuPermissions =
      await this.permissionHelper.getMenuPermissions(userId);

    return {
      canManageUsers,
      canManageProjects,
      canViewStatistics,
      isManager,
      groupedPermissions,
      menuPermissions,
    };
  }
}
```

### **4. Frontend Integration**

#### **API Response cho Menu Permissions**

```typescript
@Controller('auth')
export class AuthController {
  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy permissions của user hiện tại' })
  async getMyPermissions(@GetCurrentUser('id') userId: number) {
    const [permissions, role, menuPermissions] = await Promise.all([
      this.permissionService.getUserPermissions(userId),
      this.permissionService.getUserRole(userId),
      this.permissionHelper.getMenuPermissions(userId),
    ]);

    return {
      permissions,
      role,
      menuPermissions,
      groupedPermissions:
        await this.permissionHelper.getGroupedPermissions(userId),
    };
  }
}
```

#### **Frontend Usage**

```typescript
// Frontend có thể sử dụng để hiển thị/ẩn menu
const userPermissions = await authService.getMyPermissions();

// Kiểm tra quyền trong component
const canCreateUser = userPermissions.permissions.includes('user.create');
const canViewReports = userPermissions.menuPermissions.some((p) =>
  p.startsWith('report.'),
);

// Hiển thị menu dựa trên quyền
if (userPermissions.groupedPermissions.user?.length > 0) {
  // Hiển thị User Management menu
}
```

## 🔧 Cấu hình và Customization

### **1. Thêm Permission mới**

```typescript
// 1. Thêm vào rbac.seed.ts
const permissionData = [
  // ... existing permissions
  { name: 'inventory.read', description: 'Xem kho hàng' },
  { name: 'inventory.create', description: 'Tạo phiếu kho' },
  { name: 'inventory.update', description: 'Cập nhật kho hàng' },
];

// 2. Gán cho roles phù hợp
const rolePermissions = [
  {
    role: 'admin',
    permissions: [
      // ... existing permissions
      'inventory.read', 'inventory.create', 'inventory.update',
    ],
  },
];

// 3. Chạy lại seed
npm run seed
```

### **2. Thêm Role mới**

```typescript
// 1. Thêm vào rbac.seed.ts
const roleData = [
  // ... existing roles
  { name: 'warehouse_manager', description: 'Quản lý kho' },
];

// 2. Định nghĩa permissions cho role
const rolePermissions = [
  // ... existing role permissions
  {
    role: 'warehouse_manager',
    permissions: [
      'inventory.read',
      'inventory.create',
      'inventory.update',
      'report.read',
      'user.read',
    ],
  },
];
```

### **3. Custom Permission Logic**

```typescript
// Tạo custom decorator cho logic phức tạp
export const RequireOwnershipOrPermission = (permission: string) => {
  return applyDecorators(
    SetMetadata('ownership_permission', permission),
    UseGuards(JwtAuthGuard, OwnershipPermissionGuard),
  );
};

// Custom Guard
@Injectable()
export class OwnershipPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceUserId = +request.params.userId;

    // Nếu là resource của chính mình, cho phép
    if (user.id === resourceUserId) {
      return true;
    }

    // Nếu không, kiểm tra permission
    const permission = this.reflector.get<string>(
      'ownership_permission',
      context.getHandler(),
    );

    return await this.permissionService.hasPermission(user.id, permission);
  }
}

// Sử dụng
@Get('users/:userId/profile')
@RequireOwnershipOrPermission('user.read')
getUserProfile(@Param('userId') userId: string) {
  // User có thể xem profile của mình hoặc có quyền user.read
}
```

## 📊 Monitoring và Debugging

### **1. Permission Logging**

```typescript
// Sử dụng PermissionLoggingInterceptor
@Controller('api')
@UseInterceptors(PermissionLoggingInterceptor)
export class ApiController {
  // Tất cả requests sẽ được log
}
```

### **2. Debug Permissions**

```typescript
// Trong service hoặc controller
async debugUserPermissions(userId: number) {
  const permissions = await this.permissionService.getUserPermissions(userId);
  const role = await this.permissionService.getUserRole(userId);

  console.log(`User ${userId}:`);
  console.log(`- Role: ${role?.name}`);
  console.log(`- Permissions: ${permissions.join(', ')}`);

  // Kiểm tra permission cụ thể
  const hasUserCreate = await this.permissionService.hasPermission(userId, 'user.create');
  console.log(`- Can create user: ${hasUserCreate}`);
}
```

### **3. Performance Monitoring**

```typescript
// Cache permissions trong request để tránh query nhiều lần
@Injectable()
export class PermissionCacheMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: NextFunction) {
    if (req.user) {
      // Cache permissions trong request
      req.userPermissions = await this.permissionService.getUserPermissions(
        req.user.id,
      );
      req.userRole = await this.permissionService.getUserRole(req.user.id);
    }
    next();
  }
}
```

## ⚠️ Best Practices

### **1. Security**

- ✅ Luôn sử dụng cả `JwtAuthGuard` và `PermissionGuard`
- ✅ Kiểm tra ownership trước khi kiểm tra permission
- ✅ Validate input parameters trong business logic
- ❌ Không rely hoàn toàn vào frontend permission check

### **2. Performance**

- ✅ Cache permissions trong request khi có thể
- ✅ Sử dụng `hasAnyPermission` thay vì multiple `hasPermission` calls
- ✅ Group permissions check trong business logic
- ❌ Không query permissions trong loops

### **3. Maintainability**

- ✅ Sử dụng constants cho permission names
- ✅ Document permissions trong API documentation
- ✅ Test permissions trong unit tests
- ❌ Không hardcode permission strings

## 🧪 Testing

```typescript
describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let permissionService: PermissionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: PermissionService,
          useValue: {
            hasPermission: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('should allow access when user has required permission', async () => {
    // Mock permission check
    jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);

    // Test guard logic
    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });
});
```

---

**🎉 Hệ thống phân quyền đã sẵn sàng sử dụng với đầy đủ tính năng và bảo mật cao!**
