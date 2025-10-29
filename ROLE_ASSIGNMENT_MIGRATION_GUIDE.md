# 🔄 Role Assignment API Migration Guide

## 📋 Tổng quan

Hệ thống đã được refactor để gộp tất cả các API gán role thành một API duy nhất `POST /role-management/assign-unified`. Điều này giúp:

- ✅ Giảm complexity từ 6 APIs xuống 1 API
- ✅ Thống nhất business logic và validation
- ✅ Hỗ trợ batch operations
- ✅ Cải thiện maintainability
- ✅ Enhanced error handling

## 🗑️ APIs đã bị XÓA

### ❌ Endpoints đã xóa:

1. **`POST /role-management/assign-role`** (deprecated)
2. **`POST /role-management/bulk-assign-role`**
3. **`POST /role-management/assign-project-manager`**
4. **`POST /role-management/assign-team-leader`**
5. **`POST /role-management/assign-division-head`**
6. **`POST /admin/bulk/assign-roles`** (duplicate)

### ❌ DTOs đã xóa:

- `AssignRoleDto`
- `BulkAssignRoleDto`
- `AssignProjectManagerDto`
- `AssignTeamLeaderDto`
- `AssignDivisionHeadDto`

## ✅ API mới: Unified Role Assignment

### 🎯 Endpoint:
```
POST /role-management/assign-unified
```

### 📝 Request Body:
```typescript
{
  targetUserId: number | number[],  // Single user hoặc batch
  roleId: number,
  context?: {
    divisionId?: number,    // Required cho DIVISION_HEAD
    projectId?: number,     // Required cho PROJECT_MANAGER  
    teamId?: number         // Required cho TEAM_LEADER
  },
  assignment?: {
    isTemporary?: boolean,
    expiresAt?: string,     // ISO date string
    reason?: string
  },
  options?: {
    confirmTransfer?: boolean,      // Xác nhận chuyển giao
    allowCrossDivision?: boolean,   // Cho phép cross-division (HR+ only)
    skipBusinessValidation?: boolean // Skip validation (SUPER_ADMIN only)
  }
}
```

### 📤 Response:
```typescript
{
  success: boolean,
  results: [
    {
      userId: number,
      success: boolean,
      message: string,
      user?: {
        id: number,
        name: string,
        email: string,
        role: { id: number, name: string }
      },
      context?: {
        division?: { id: number, name: string },
        project?: { id: number, name: string, code: string },
        team?: { id: number, name: string }
      },
      replacedUser?: {
        id: number,
        name: string,
        email: string
      }
    }
  ],
  summary?: {
    total: number,
    successful: number,
    failed: number
  },
  warnings?: string[]
}
```

## 🔄 Migration Examples

### 1. **Gán role đơn giản (thay thế assign-role)**

#### ❌ Cũ:
```typescript
POST /role-management/assign-role
{
  "userId": 123,
  "roleId": 2,
  "roleName": "team_leader"
}
```

#### ✅ Mới:
```typescript
POST /role-management/assign-unified
{
  "targetUserId": [123],
  "roleId": 2,
  "assignment": {
    "reason": "Promotion to team leader"
  }
}
```

### 2. **Gán PM cho project (thay thế assign-project-manager)**

#### ❌ Cũ:
```typescript
POST /role-management/assign-project-manager
{
  "projectId": 10,
  "userId": 123,
  "reason": "New PM assignment",
  "confirmTransfer": true
}
```

#### ✅ Mới:
```typescript
POST /role-management/assign-unified
{
  "targetUserId": [123],
  "roleId": 4, // PROJECT_MANAGER role ID
  "context": {
    "projectId": 10
  },
  "assignment": {
    "reason": "New PM assignment"
  },
  "options": {
    "confirmTransfer": true
  }
}
```

### 3. **Gán Team Leader (thay thế assign-team-leader)**

#### ❌ Cũ:
```typescript
POST /role-management/assign-team-leader
{
  "teamId": 5,
  "userId": 456,
  "reason": "Team leadership change",
  "confirmTransfer": true
}
```

#### ✅ Mới:
```typescript
POST /role-management/assign-unified
{
  "targetUserId": [456],
  "roleId": 3, // TEAM_LEADER role ID
  "context": {
    "teamId": 5
  },
  "assignment": {
    "reason": "Team leadership change"
  },
  "options": {
    "confirmTransfer": true
  }
}
```

### 4. **Gán Division Head (thay thế assign-division-head)**

#### ❌ Cũ:
```typescript
POST /role-management/assign-division-head
{
  "divisionId": 2,
  "userId": 789,
  "reason": "New division head",
  "confirmTransfer": true
}
```

#### ✅ Mới:
```typescript
POST /role-management/assign-unified
{
  "targetUserId": [789],
  "roleId": 5, // DIVISION_HEAD role ID
  "context": {
    "divisionId": 2
  },
  "assignment": {
    "reason": "New division head"
  },
  "options": {
    "confirmTransfer": true
  }
}
```

### 5. **Bulk assignment (thay thế bulk-assign-role)**

#### ❌ Cũ:
```typescript
POST /role-management/bulk-assign-role
{
  "userIds": [123, 456, 789],
  "roleId": 2,
  "roleName": "team_leader"
}
```

#### ✅ Mới:
```typescript
POST /role-management/assign-unified
{
  "targetUserId": [123, 456, 789],
  "roleId": 2,
  "assignment": {
    "reason": "Bulk promotion to team leader"
  }
}
```

## 🔐 Business Rules & Validation

### **Context Requirements:**
- **PROJECT_MANAGER**: Yêu cầu `context.projectId`
- **TEAM_LEADER**: Yêu cầu `context.teamId`
- **DIVISION_HEAD**: Yêu cầu `context.divisionId`
- **Other roles**: Không yêu cầu context

### **Permission Matrix:**
| Manager Role | Can Assign | Restrictions |
|-------------|------------|--------------|
| **SUPER_ADMIN** | All roles | No restrictions |
| **ADMIN** | employee → hr_manager | No restrictions |
| **HR_MANAGER** | employee → project_manager | No restrictions |
| **PROJECT_MANAGER** | employee, team_leader | Within managed projects |
| **DIVISION_HEAD** | team_leader, project_manager | Same division only |
| **TEAM_LEADER** | None | No assignment rights |
| **EMPLOYEE** | None | No assignment rights |

### **Transfer Logic:**
- **confirmTransfer: true** - Bắt buộc khi đã có người giữ role
- **Automatic demotion** - User cũ được chuyển về role thấp hơn
- **Activity logging** - Tất cả thay đổi được log đầy đủ

## 🚀 Advanced Features

### **Temporary Assignments:**
```typescript
{
  "targetUserId": [123],
  "roleId": 4,
  "context": { "projectId": 10 },
  "assignment": {
    "isTemporary": true,
    "expiresAt": "2024-12-31T23:59:59Z",
    "reason": "Temporary PM during leave"
  }
}
```

### **Cross-Division Assignment (HR+ only):**
```typescript
{
  "targetUserId": [123],
  "roleId": 5,
  "context": { "divisionId": 3 },
  "options": {
    "allowCrossDivision": true
  }
}
```

### **Batch with Mixed Results:**
```typescript
// Response sẽ chứa kết quả cho từng user
{
  "success": true,
  "results": [
    { "userId": 123, "success": true, "message": "Gán role thành công" },
    { "userId": 456, "success": false, "message": "Không có quyền gán role cho user này" }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

## 📊 Error Handling

### **Common Errors:**
- `400`: Missing required context (projectId, teamId, divisionId)
- `403`: Insufficient permissions for role assignment
- `404`: Role, user, project, team, or division not found
- `409`: Conflict - role already assigned (need confirmTransfer)

### **Error Response Format:**
```typescript
{
  "statusCode": 400,
  "message": "Role project_manager yêu cầu projectId",
  "error": "Bad Request"
}
```

## 🎯 Benefits của Unified API

1. **Consistency** - Tất cả role assignments đều follow cùng pattern
2. **Flexibility** - Support cả single và batch operations
3. **Context-aware** - Smart validation dựa trên role type
4. **Better UX** - Comprehensive error messages và warnings
5. **Maintainability** - Single source of truth cho role assignment logic
6. **Extensibility** - Dễ dàng thêm features mới (temporary assignments, etc.)

## 📝 Notes

- **Backward compatibility**: `PATCH /role-management/user/:userId/role` vẫn hoạt động (internally sử dụng unified API)
- **Read operations**: Tất cả GET endpoints vẫn giữ nguyên
- **Activity logging**: Enhanced với unified log format
- **Transaction safety**: Tất cả operations đều được wrap trong database transactions

---

**🔗 Related Files:**
- `src/auth/dto/unified-role-assignment.dto.ts` - New DTO definitions
- `src/auth/services/role-assignment.service.ts` - Unified business logic
- `src/auth/controllers/role-management.controller.ts` - Updated controller
