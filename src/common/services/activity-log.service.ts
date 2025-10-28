import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityLogData {
  logName: string;
  description: string;
  subjectType: string;
  event: string;
  subjectId: number;
  causerId: number;
  properties?: Record<string, any>;
  batchUuid?: string;
}

export enum ActivityEvent {
  // Request events
  REQUEST_CREATED = 'request.created',
  REQUEST_APPROVED = 'request.approved',
  REQUEST_REJECTED = 'request.rejected',
  REQUEST_CANCELLED = 'request.cancelled',
  REQUEST_VIEWED = 'request.viewed',
  
  // User events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  
  // Role events
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REMOVED = 'role.removed',
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  
  // Division events
  DIVISION_CREATED = 'division.created',
  DIVISION_UPDATED = 'division.updated',
  DIVISION_DELETED = 'division.deleted',
  
  // Timesheet events
  TIMESHEET_CHECKIN = 'timesheet.checkin',
  TIMESHEET_CHECKOUT = 'timesheet.checkout',
  TIMESHEET_UPDATED = 'timesheet.updated',
  
  // System events
  SYSTEM_BACKUP = 'system.backup',
  SYSTEM_RESTORE = 'system.restore',
  SYSTEM_MAINTENANCE = 'system.maintenance',
}

export enum SubjectType {
  USER = 'User',
  REQUEST = 'Request',
  ROLE = 'Role',
  DIVISION = 'Division',
  TIMESHEET = 'Timesheet',
  SYSTEM = 'System',
}

@Injectable()
export class ActivityLogService {
  constructor(public readonly prisma: PrismaService) {}

  /**
   * Log một activity đơn lẻ
   */
  async log(data: ActivityLogData): Promise<void> {
    try {
      await this.prisma.activity_log.create({
        data: {
          log_name: data.logName,
          description: data.description,
          subject_type: data.subjectType,
          event: data.event,
          subject_id: data.subjectId,
          causer_type: 'User', // Mặc định là User
          causer_id: data.causerId,
          properties: data.properties || {},
          batch_uuid: data.batchUuid || uuidv4(),
        },
      });
    } catch (error) {
      // Log error nhưng không throw để không ảnh hưởng business logic
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Log nhiều activities cùng lúc với cùng batch UUID
   */
  async logBatch(activities: Omit<ActivityLogData, 'batchUuid'>[]): Promise<void> {
    const batchUuid = uuidv4();
    
    try {
      await this.prisma.activity_log.createMany({
        data: activities.map(activity => ({
          log_name: activity.logName,
          description: activity.description,
          subject_type: activity.subjectType,
          event: activity.event,
          subject_id: activity.subjectId,
          causer_type: 'User',
          causer_id: activity.causerId,
          properties: activity.properties || {},
          batch_uuid: batchUuid,
        })),
      });
    } catch (error) {
      console.error('Failed to log batch activities:', error);
    }
  }

  /**
   * Log request creation
   */
  async logRequestCreated(
    requestType: string,
    requestId: number,
    userId: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logName: 'Request Management',
      description: `Tạo đơn ${requestType} mới`,
      subjectType: SubjectType.REQUEST,
      event: ActivityEvent.REQUEST_CREATED,
      subjectId: requestId,
      causerId: userId,
      properties: {
        request_type: requestType,
        ...details,
      },
    });
  }

  /**
   * Log request approval/rejection
   */
  async logRequestApproval(
    requestType: string,
    requestId: number,
    approverId: number,
    action: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    const event = action === 'approved' 
      ? ActivityEvent.REQUEST_APPROVED 
      : ActivityEvent.REQUEST_REJECTED;
    
    await this.log({
      logName: 'Request Management',
      description: `${action === 'approved' ? 'Phê duyệt' : 'Từ chối'} đơn ${requestType}`,
      subjectType: SubjectType.REQUEST,
      event,
      subjectId: requestId,
      causerId: approverId,
      properties: {
        request_type: requestType,
        action,
        reason,
      },
    });
  }

  /**
   * Log request view (for sensitive data access)
   */
  async logRequestView(
    requestType: string,
    requestId: number,
    viewerId: number,
    requestOwnerId: number
  ): Promise<void> {
    // Chỉ log khi viewer không phải là owner
    if (viewerId !== requestOwnerId) {
      await this.log({
        logName: 'Request Access',
        description: `Xem đơn ${requestType}`,
        subjectType: SubjectType.REQUEST,
        event: ActivityEvent.REQUEST_VIEWED,
        subjectId: requestId,
        causerId: viewerId,
        properties: {
          request_type: requestType,
          request_owner_id: requestOwnerId,
        },
      });
    }
  }

  /**
   * Log user login
   */
  async logUserLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      logName: 'Authentication',
      description: 'Đăng nhập hệ thống',
      subjectType: SubjectType.USER,
      event: ActivityEvent.USER_LOGIN,
      subjectId: userId,
      causerId: userId,
      properties: {
        ip_address: ipAddress,
        user_agent: userAgent,
        login_time: new Date().toISOString(),
      },
    });
  }

  /**
   * Log user logout
   */
  async logUserLogout(userId: number): Promise<void> {
    await this.log({
      logName: 'Authentication',
      description: 'Đăng xuất hệ thống',
      subjectType: SubjectType.USER,
      event: ActivityEvent.USER_LOGOUT,
      subjectId: userId,
      causerId: userId,
      properties: {
        logout_time: new Date().toISOString(),
      },
    });
  }

  /**
   * Log role assignment
   */
  async logRoleAssignment(
    userId: number,
    roleId: number,
    assignerId: number,
    action: 'assigned' | 'removed',
    divisionId?: number
  ): Promise<void> {
    const event = action === 'assigned' 
      ? ActivityEvent.ROLE_ASSIGNED 
      : ActivityEvent.ROLE_REMOVED;
    
    await this.log({
      logName: 'Role Management',
      description: `${action === 'assigned' ? 'Gán' : 'Gỡ bỏ'} role cho user`,
      subjectType: SubjectType.USER,
      event,
      subjectId: userId,
      causerId: assignerId,
      properties: {
        role_id: roleId,
        action,
        division_id: divisionId,
      },
    });
  }

  /**
   * Log timesheet check-in/out
   */
  async logTimesheetAction(
    userId: number,
    action: 'checkin' | 'checkout',
    timesheetId: number,
    location?: { latitude: number; longitude: number }
  ): Promise<void> {
    const event = action === 'checkin' 
      ? ActivityEvent.TIMESHEET_CHECKIN 
      : ActivityEvent.TIMESHEET_CHECKOUT;
    
    await this.log({
      logName: 'Timesheet',
      description: `${action === 'checkin' ? 'Check-in' : 'Check-out'}`,
      subjectType: SubjectType.TIMESHEET,
      event,
      subjectId: timesheetId,
      causerId: userId,
      properties: {
        action,
        location,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log CRUD operations
   */
  async logCrudOperation(
    entityType: string,
    entityId: number,
    operation: 'created' | 'updated' | 'deleted',
    userId: number,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logName: `${entityType} Management`,
      description: `${operation === 'created' ? 'Tạo' : operation === 'updated' ? 'Cập nhật' : 'Xóa'} ${entityType}`,
      subjectType: entityType as SubjectType,
      event: `${entityType.toLowerCase()}.${operation}` as ActivityEvent,
      subjectId: entityId,
      causerId: userId,
      properties: {
        operation,
        changes,
      },
    });
  }

  /**
   * Lấy activity logs với phân trang
   */
  async getActivityLogs(options: {
    page?: number;
    limit?: number;
    logName?: string;
    event?: string;
    causerId?: number;
    subjectId?: number;
    subjectType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 20, ...filters } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.logName) where.log_name = { contains: filters.logName };
    if (filters.event) where.event = filters.event;
    if (filters.causerId) where.causer_id = filters.causerId;
    if (filters.subjectId) where.subject_id = filters.subjectId;
    if (filters.subjectType) where.subject_type = filters.subjectType;
    
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activity_log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          causer: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.activity_log.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
