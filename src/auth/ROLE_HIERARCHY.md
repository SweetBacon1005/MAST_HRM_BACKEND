# Hệ Thống Phân Quyền Phân Cấp (Role Hierarchy)

## 📋 Tổng quan

Hệ thống phân quyền phân cấp cho phép các role cấp cao **tự động kế thừa** tất cả quyền (permissions) của các role cấp thấp hơn mà họ có thể quản lý.

### Ví dụ:
- **Division Head** có thể xem và sửa thông tin cá nhân (permission của Employee)
- **HR Manager** có thể làm mọi việc mà Team Leader và Employee có thể làm
- **Admin** có tất cả quyền của mọi role thấp hơn

## 🎯 Cấu trúc phân cấp Role

```
Level 7: Super Admin    ← Có TẤT CẢ quyền của level 1-6
   ↓
Level 6: Admin          ← Có TẤT CẢ quyền của level 1-5
   ↓
Level 5: HR Manager     ← Có TẤT CẢ quyền của level 1-4
   ↓
Level 4: Project Manager ← Có TẤT CẢ quyền của level 1-2
Level 3: Division Head   ← Có TẤT CẢ quyền của level 1-2
   ↓
Level 2: Team Leader    ← Có TẤT CẢ quyền của level 1
   ↓
Level 1: Employee       ← Quyền cơ bản
```

## 📊 Chi tiết phân cấp

| Level | Role | Có thể quản lý | Kế thừa quyền từ |
|-------|------|----------------|------------------|
| 1 | Employee | - | - |
| 2 | Team Leader | Employee | Employee |
| 3 | Division Head | Employee, Team Leader | Employee, Team Leader |
| 4 | Project Manager | Employee, Team Leader | Employee, Team Leader |
| 5 | HR Manager | Employee, Team Leader, Division Head, Project Manager | Tất cả level 1-4 |
| 6 | Admin | Tất cả trừ Super Admin | Tất cả level 1-5 |
| 7 | Super Admin | Tất cả | Tất cả level 1-6 |

## 🔧 Cách hoạt động

### 1. **Kiểm tra quyền trực tiếp**
Đầu tiên, hệ thống kiểm tra xem user có permission được gán trực tiếp cho role của họ không.

```typescript
// Ví dụ: Division Head có permission "division.read"
@RequirePermission('division.read')
getDivisions() { ... }
```

### 2. **Kiểm tra quyền kế thừa**
Nếu không có quyền trực tiếp, hệ thống sẽ kiểm tra xem permission đó có thuộc về các role thấp hơn mà user có thể quản lý không.

```typescript
// Division Head KHÔNG có permission "profile.update" trực tiếp
// NHƯNG Employee có "profile.update"
// => Division Head TỰ ĐỘNG có quyền này (kế thừa)

@RequirePermission('profile.update')
updateProfile() { ... }
// ✅ Division Head CÓ THỂ gọi API này
```

## 🎯 Ví dụ thực tế

### Scenario 1: Xem thông tin cá nhân

```typescript
// Permission: profile.read (thuộc Employee)

// Employee (Level 1)
✅ Có quyền trực tiếp

// Team Leader (Level 2)
✅ Có quyền kế thừa từ Employee

// Division Head (Level 3)
✅ Có quyền kế thừa từ Employee

// Admin (Level 6)
✅ Có quyền kế thừa từ Employee
```

### Scenario 2: Quản lý phòng ban

```typescript
// Permission: division.manage (thuộc Division Head)

// Employee (Level 1)
❌ KHÔNG có quyền

// Team Leader (Level 2)
❌ KHÔNG có quyền (không quản lý Division Head)

// Division Head (Level 3)
✅ Có quyền trực tiếp

// HR Manager (Level 5)
✅ Có quyền kế thừa từ Division Head

// Admin (Level 6)
✅ Có quyền kế thừa từ Division Head
```

### Scenario 3: Phê duyệt nghỉ phép

```typescript
// Permission: leave.approve (thuộc Team Leader)

// Employee (Level 1)
❌ KHÔNG có quyền

// Team Leader (Level 2)
✅ Có quyền trực tiếp

// Division Head (Level 3)
✅ Có quyền kế thừa từ Team Leader

// Project Manager (Level 4)
✅ Có quyền kế thừa từ Team Leader
```

## 💻 Sử dụng trong Code

### 1. Sử dụng decorator `@RequirePermission`

```typescript
@Controller('users')
export class UserController {
  // Chỉ cần khai báo permission của role thấp nhất
  @RequirePermission('profile.read')
  @Get('profile')
  getProfile() {
    // Employee, Team Leader, Division Head, ... đều có thể truy cập
    return this.userService.getProfile();
  }

  @RequirePermission('division.manage')
  @Post('divisions')
  createDivision() {
    // Chỉ Division Head, HR Manager, Admin, Super Admin có quyền
    return this.divisionService.create();
  }
}
```

### 2. Check permission trong Service

```typescript
export class SomeService {
  constructor(private permissionService: PermissionService) {}

  async doSomething(userId: number) {
    // Tự động check cả quyền trực tiếp và kế thừa
    const hasPermission = await this.permissionService.hasPermission(
      userId,
      'some.permission'
    );

    if (!hasPermission) {
      throw new ForbiddenException('Không có quyền');
    }

    // Do something...
  }
}
```

### 3. Sử dụng RoleHierarchyService

```typescript
export class SomeService {
  constructor(private roleHierarchyService: RoleHierarchyService) {}

  canUserManageTarget(managerRole: string, targetRole: string): boolean {
    // Kiểm tra manager role có thể quản lý target role không
    return this.roleHierarchyService.canManageRole(managerRole, targetRole);
  }

  getManageableRoles(roleName: string): string[] {
    // Lấy danh sách role mà roleName có thể quản lý
    return this.roleHierarchyService.getManageableRoles(roleName);
  }

  getRoleLevel(roleName: string): number {
    // Lấy level của role
    return this.roleHierarchyService.getRoleLevel(roleName);
  }
}
```

## 📝 Lưu ý quan trọng

### 1. **Gán permission đúng role**
- Chỉ gán permission cho role thấp nhất cần thiết
- Các role cao hơn sẽ tự động kế thừa

```typescript
// ✅ ĐÚNG: Gán cho Employee
permission_role: {
  role: 'employee',
  permission: 'profile.read'
}

// ❌ SAI: Không cần gán lại cho Team Leader, Division Head, ...
// Họ sẽ tự động có quyền này
```

### 2. **Hiệu suất**
- Hệ thống cache permissions của các role thấp hơn
- Query được optimize để tránh N+1 problem
- Sử dụng `forwardRef` để tránh circular dependency

### 3. **Testing**
```typescript
describe('Role Hierarchy', () => {
  it('Division Head should have Employee permissions', async () => {
    // Division Head login
    const divisionHead = await login('division_head@test.com');
    
    // Gọi API chỉ Employee có quyền
    const response = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${divisionHead.token}`);
    
    expect(response.status).toBe(200); // ✅ Success
  });

  it('Employee should NOT have Division Head permissions', async () => {
    // Employee login
    const employee = await login('employee@test.com');
    
    // Gọi API chỉ Division Head có quyền
    const response = await request(app)
      .post('/divisions')
      .set('Authorization', `Bearer ${employee.token}`);
    
    expect(response.status).toBe(403); // ❌ Forbidden
  });
});
```

## 🔍 Debug và Troubleshooting

### Kiểm tra quyền của user

```typescript
// Trong service hoặc controller
const userPermissions = await this.permissionService.getUserPermissions(userId);
console.log('User permissions:', userPermissions);

const userRole = await this.permissionService.getUserRole(userId);
console.log('User role:', userRole);

const manageableRoles = this.roleHierarchyService.getManageableRoles(userRole.name);
console.log('Can manage:', manageableRoles);
```

### Log từ PermissionService

```
[PermissionService] User 123 has direct permission: division.read
[PermissionService] User 123 has inherited permission: profile.update from lower roles
[PermissionService] Permission profile.update found in lower role: employee (User 123)
```

## 🎨 Best Practices

### 1. **Thiết kế permissions theo tính năng, không theo role**

```typescript
// ✅ ĐÚNG: Permission theo tính năng
'profile.read'
'profile.update'
'division.manage'
'leave.approve'

// ❌ SAI: Permission theo role
'employee.actions'
'manager.actions'
```

### 2. **Gán permissions ở mức thấp nhất**

```typescript
// ✅ ĐÚNG
Employee -> profile.read, profile.update, leave.request
Team Leader -> leave.approve, team.manage
Division Head -> division.manage

// ❌ SAI: Gán lại cho mỗi role
Employee -> profile.read
Team Leader -> profile.read, leave.approve
Division Head -> profile.read, leave.approve, division.manage
```

### 3. **Sử dụng naming convention nhất quán**

```typescript
// Format: <resource>.<action>
'user.read'
'user.create'
'user.update'
'user.delete'

'division.read'
'division.create'
'division.manage'

'leave.request'
'leave.approve'
'leave.reject'
```

## 📚 Tài liệu liên quan

- `/src/auth/services/permission.service.ts` - Service kiểm tra quyền
- `/src/auth/services/role-hierarchy.service.ts` - Service quản lý phân cấp
- `/src/auth/guards/permission.guard.ts` - Guard bảo vệ endpoints
- `/src/auth/decorators/require-permission.decorator.ts` - Decorator khai báo quyền

## 🎯 Migration từ hệ thống cũ

Nếu bạn đang nâng cấp từ hệ thống không có role hierarchy:

1. **Review lại permissions hiện có**
2. **Xóa các permissions trùng lặp ở role cao hơn**
3. **Giữ lại permissions ở role thấp nhất**
4. **Test kỹ tất cả use cases**

```typescript
// VÍ DỤ: Trước khi có role hierarchy
Employee: ['profile.read', 'profile.update']
Team Leader: ['profile.read', 'profile.update', 'leave.approve']
Division Head: ['profile.read', 'profile.update', 'leave.approve', 'division.manage']

// SAU KHI có role hierarchy
Employee: ['profile.read', 'profile.update']
Team Leader: ['leave.approve']                    // Kế thừa Employee
Division Head: ['division.manage']                 // Kế thừa Employee + Team Leader
```

---

**Lưu ý:** Hệ thống này đã được implement và test kỹ lưỡng. Tất cả API endpoints hiện tại sẽ tự động hoạt động với role hierarchy mà không cần thay đổi code!

