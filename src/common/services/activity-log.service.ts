import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityLogData {
  logName: string;
  description: string;
  subjectType: string;
  event: string;
  subjectId: number;
  causer_id: number;
  properties?: Record<string, any>;
  batchUuid?: string;
}

export enum ActivityEvent {
  REQUEST_CREATED = 'request.created',
  REQUEST_UPDATED = 'request.updated',
  REQUEST_DELETED = 'request.deleted',
  REQUEST_APPROVED = 'request.approved',
  REQUEST_REJECTED = 'request.rejected',
  REQUEST_CANCELLED = 'request.cancelled',
  REQUEST_VIEWED = 'request.viewed',
  
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_PASSWORD_CHANGED = 'user.password.changed',
  USER_PASSWORD_RESET = 'user.password.reset',
  
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REMOVED = 'role.removed',
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  
  DIVISION_CREATED = 'division.created',
  DIVISION_UPDATED = 'division.updated',
  DIVISION_DELETED = 'division.deleted',
  DIVISION_MEMBER_ADDED = 'division.member.added',
  DIVISION_MEMBER_REMOVED = 'division.member.removed',
  
  TEAM_CREATED = 'team.created',
  TEAM_UPDATED = 'team.updated',
  TEAM_DELETED = 'team.deleted',
  TEAM_MEMBER_ADDED = 'team.member.added',
  TEAM_MEMBER_REMOVED = 'team.member.removed',
  
  TIMESHEET_CHECKIN = 'timesheet.checkin',
  TIMESHEET_CHECKOUT = 'timesheet.checkout',
  TIMESHEET_CREATED = 'timesheet.created',
  TIMESHEET_UPDATED = 'timesheet.updated',
  TIMESHEET_DELETED = 'timesheet.deleted',
  TIMESHEET_FACE_REGISTERED = 'timesheet.face.registered',
  
  HOLIDAY_CREATED = 'holiday.created',
  HOLIDAY_UPDATED = 'holiday.updated',
  HOLIDAY_DELETED = 'holiday.deleted',
  
  MEETING_ROOM_CREATED = 'meeting.room.created',
  MEETING_ROOM_UPDATED = 'meeting.room.updated',
  MEETING_ROOM_DELETED = 'meeting.room.deleted',
  MEETING_ROOM_BOOKED = 'meeting.room.booked',
  MEETING_ROOM_BOOKING_UPDATED = 'meeting.room.booking.updated',
  MEETING_ROOM_BOOKING_CANCELLED = 'meeting.room.booking.cancelled',
  
  ASSET_CREATED = 'asset.created',
  ASSET_UPDATED = 'asset.updated',
  ASSET_DELETED = 'asset.deleted',
  ASSET_ASSIGNED = 'asset.assigned',
  ASSET_RETURNED = 'asset.returned',
  ASSET_REQUEST_CREATED = 'asset.request.created',
  ASSET_REQUEST_APPROVED = 'asset.request.approved',
  ASSET_REQUEST_REJECTED = 'asset.request.rejected',
  
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  PROJECT_MEMBER_ADDED = 'project.member.added',
  PROJECT_MEMBER_REMOVED = 'project.member.removed',
  PROJECT_PROGRESS_UPDATED = 'project.progress.updated',
  
  SYSTEM_BACKUP = 'system.backup',
  SYSTEM_RESTORE = 'system.restore',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  
  NEWS_CREATED = 'news.created',
  NEWS_UPDATED = 'news.updated',
  NEWS_DELETED = 'news.deleted',
  NEWS_SUBMITTED = 'news.submitted',
  NEWS_APPROVED = 'news.approved',
  NEWS_REJECTED = 'news.rejected',
  NEWS_VIEWED = 'news.viewed',
  
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_UNREAD = 'notification.unread',
  NOTIFICATION_VIEWED = 'notification.viewed',
}

export enum SubjectType {
  USER = 'User',
  REQUEST = 'Request',
  ROLE = 'Role',
  DIVISION = 'Division',
  TEAM = 'Team',
  TIMESHEET = 'Timesheet',
  HOLIDAY = 'Holiday',
  MEETING_ROOM = 'MeetingRoom',
  MEETING_BOOKING = 'MeetingBooking',
  ASSET = 'Asset',
  ASSET_REQUEST = 'AssetRequest',
  PROJECT = 'Project',
  SYSTEM = 'System',
  NEWS = 'News',
  NOTIFICATION = 'Notification',
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
          causer_id: data.causer_id,
          properties: data.properties || {},
        },
      });
    } catch {
      // Log error but don't throw to avoid affecting business logic
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
          causer_id: activity.causer_id,
          properties: activity.properties || {},
        })),
      });
    } catch {
      // Silently fail to not affect business logic
    }
  }

  /**
   * Log request creation
   */
  async logRequestCreated(
    requestType: string,
    requestId: number,
    user_id: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logName: 'Request Management',
      description: `Tạo đơn ${requestType} mới`,
      subjectType: SubjectType.REQUEST,
      event: ActivityEvent.REQUEST_CREATED,
      subjectId: requestId,
      causer_id: user_id,
      properties: {
        request_type: requestType,
        ...details,
      },
    });
  }

  /**
   * Log request update
   */
  async logRequestUpdated(
    requestType: string,
    requestId: number,
    user_id: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logName: 'Request Management',
      description: `Cập nhật đơn ${requestType}`,
      subjectType: SubjectType.REQUEST,
      event: ActivityEvent.REQUEST_UPDATED,
      subjectId: requestId,
      causer_id: user_id,
      properties: {
        request_type: requestType,
        ...details,
      },
    });
  }

  async logRequestDeleted(
    requestType: string,
    requestId: number,
    user_id: number,
  ): Promise<void> {
    await this.log({
      logName: 'Request Management',
      description: `Xóa đơn ${requestType}`,
      subjectType: SubjectType.REQUEST,
      event: ActivityEvent.REQUEST_DELETED,
      subjectId: requestId,
      causer_id: user_id,
      properties: {
        request_type: requestType,
      },
    });
  }

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
      causer_id: approverId,
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
        causer_id: viewerId,
        properties: {
          request_type: requestType,
          request_owner_id: requestOwnerId,
        },
      });
    }
  }

  async logUserLogin(user_id: number): Promise<void> {
    await this.log({
      logName: 'Authentication',
      description: 'Đăng nhập hệ thống',
      subjectType: SubjectType.USER,
      event: ActivityEvent.USER_LOGIN,
      subjectId: user_id,
      causer_id: user_id,
      properties: {
        login_time: new Date().toISOString(),
      },
    });
  }

  async logUserLogout(user_id: number): Promise<void> {
    await this.log({
      logName: 'Authentication',
      description: 'Đăng xuất hệ thống',
      subjectType: SubjectType.USER,
      event: ActivityEvent.USER_LOGOUT,
      subjectId: user_id,
      causer_id: user_id,
      properties: {
        logout_time: new Date().toISOString(),
      },
    });
  }

  async logRoleAssignment(
    user_id: number,
    role_id: number,
    assigner_id: number,
    action: 'assigned' | 'removed',
    division_id?: number
  ): Promise<void> {
    const event = action === 'assigned' 
      ? ActivityEvent.ROLE_ASSIGNED 
      : ActivityEvent.ROLE_REMOVED;
    
    await this.log({
      logName: 'Role Management',
      description: `${action === 'assigned' ? 'Gán' : 'Gỡ bỏ'} role cho user`,
      subjectType: SubjectType.USER,
      event,
      subjectId: user_id,
      causer_id: assigner_id,
      properties: {
        role_id: role_id,
        action,
        division_id: division_id,
      },
    });
  }

  async logTimesheetAction(
    user_id: number,
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
      causer_id: user_id,
      properties: {
        action,
        location,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logCrudOperation(
    entityType: string,
    entityId: number,
    operation: 'created' | 'updated' | 'deleted',
    user_id: number,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.log({
      logName: `${entityType} Management`,
      description: `${operation === 'created' ? 'Tạo' : operation === 'updated' ? 'Cập nhật' : 'Xóa'} ${entityType}`,
      subjectType: entityType as SubjectType,
      event: `${entityType.toLowerCase()}.${operation}` as ActivityEvent,
      subjectId: entityId,
      causer_id: user_id,
      properties: {
        operation,
        changes,
      },
    });
  }

  async logNewsOperation(
    operation: 'created' | 'updated' | 'deleted' | 'submitted' | 'approved' | 'rejected' | 'viewed',
    newsId: number,
    user_id: number,
    news_title?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.NEWS_CREATED,
      updated: ActivityEvent.NEWS_UPDATED,
      deleted: ActivityEvent.NEWS_DELETED,
      submitted: ActivityEvent.NEWS_SUBMITTED,
      approved: ActivityEvent.NEWS_APPROVED,
      rejected: ActivityEvent.NEWS_REJECTED,
      viewed: ActivityEvent.NEWS_VIEWED,
    };

    const descriptionMap = {
      created: 'Tạo tin tức mới',
      updated: 'Cập nhật tin tức',
      deleted: 'Xóa tin tức',
      submitted: 'Gửi tin tức để duyệt',
      approved: 'Phê duyệt tin tức',
      rejected: 'Từ chối tin tức',
      viewed: 'Xem tin tức',
    };

    await this.log({
      logName: 'News Management',
      description: news_title ? `${descriptionMap[operation]}: "${news_title}"` : descriptionMap[operation],
      subjectType: SubjectType.NEWS,
      event: eventMap[operation],
      subjectId: newsId,
      causer_id: user_id,
      properties: {
        operation,
        news_title: news_title,
        ...details,
      },
    });
  }

  /**
   * Log notification operations
   */
  async logNotificationOperation(
    operation: 'created' | 'updated' | 'deleted' | 'read' | 'unread' | 'viewed',
    userNotificationId: number,
    user_id: number,
    notificationTitle?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.NOTIFICATION_CREATED,
      updated: ActivityEvent.NOTIFICATION_UPDATED,
      deleted: ActivityEvent.NOTIFICATION_DELETED,
      read: ActivityEvent.NOTIFICATION_READ,
      unread: ActivityEvent.NOTIFICATION_UNREAD,
      viewed: ActivityEvent.NOTIFICATION_VIEWED,
    };

    const descriptionMap = {
      created: 'Tạo thông báo mới',
      updated: 'Cập nhật thông báo',
      deleted: 'Xóa thông báo',
      read: 'Đánh dấu đã đọc thông báo',
      unread: 'Đánh dấu chưa đọc thông báo',
      viewed: 'Xem thông báo',
    };

    await this.log({
      logName: 'Notification Management',
      description: notificationTitle ? `${descriptionMap[operation]}: "${notificationTitle}"` : descriptionMap[operation],
      subjectType: SubjectType.NOTIFICATION,
      event: eventMap[operation],
      subjectId: userNotificationId,
      causer_id: user_id,
      properties: {
        operation,
        notification_title: notificationTitle,
        ...details,
      },
    });
  }

  async logDivisionOperation(
    operation: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed',
    divisionId: number,
    user_id: number,
    divisionName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.DIVISION_CREATED,
      updated: ActivityEvent.DIVISION_UPDATED,
      deleted: ActivityEvent.DIVISION_DELETED,
      member_added: ActivityEvent.DIVISION_MEMBER_ADDED,
      member_removed: ActivityEvent.DIVISION_MEMBER_REMOVED,
    };

    const descriptionMap = {
      created: 'Tạo phòng ban mới',
      updated: 'Cập nhật phòng ban',
      deleted: 'Xóa phòng ban',
      member_added: 'Thêm thành viên vào phòng ban',
      member_removed: 'Xóa thành viên khỏi phòng ban',
    };

    await this.log({
      logName: 'Division Management',
      description: divisionName ? `${descriptionMap[operation]}: "${divisionName}"` : descriptionMap[operation],
      subjectType: SubjectType.DIVISION,
      event: eventMap[operation],
      subjectId: divisionId,
      causer_id: user_id,
      properties: {
        operation,
        division_name: divisionName,
        ...details,
      },
    });
  }

  async logTeamOperation(
    operation: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed',
    teamId: number,
    user_id: number,
    teamName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.TEAM_CREATED,
      updated: ActivityEvent.TEAM_UPDATED,
      deleted: ActivityEvent.TEAM_DELETED,
      member_added: ActivityEvent.TEAM_MEMBER_ADDED,
      member_removed: ActivityEvent.TEAM_MEMBER_REMOVED,
    };

    const descriptionMap = {
      created: 'Tạo team mới',
      updated: 'Cập nhật team',
      deleted: 'Xóa team',
      member_added: 'Thêm thành viên vào team',
      member_removed: 'Xóa thành viên khỏi team',
    };

    await this.log({
      logName: 'Team Management',
      description: teamName ? `${descriptionMap[operation]}: "${teamName}"` : descriptionMap[operation],
      subjectType: SubjectType.TEAM,
      event: eventMap[operation],
      subjectId: teamId,
      causer_id: user_id,
      properties: {
        operation,
        team_name: teamName,
        ...details,
      },
    });
  }

  async logTimesheetOperation(
    operation: 'created' | 'updated' | 'deleted' | 'checkin' | 'checkout' | 'face_registered',
    timesheetId: number,
    user_id: number,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.TIMESHEET_CREATED,
      updated: ActivityEvent.TIMESHEET_UPDATED,
      deleted: ActivityEvent.TIMESHEET_DELETED,
      checkin: ActivityEvent.TIMESHEET_CHECKIN,
      checkout: ActivityEvent.TIMESHEET_CHECKOUT,
      face_registered: ActivityEvent.TIMESHEET_FACE_REGISTERED,
    };

    const descriptionMap = {
      created: 'Tạo timesheet',
      updated: 'Cập nhật timesheet',
      deleted: 'Xóa timesheet',
      checkin: 'Check-in',
      checkout: 'Check-out',
      face_registered: 'Đăng ký khuôn mặt',
    };

    await this.log({
      logName: 'Timesheet Management',
      description: descriptionMap[operation],
      subjectType: SubjectType.TIMESHEET,
      event: eventMap[operation],
      subjectId: timesheetId,
      causer_id: user_id,
      properties: {
        operation,
        ...details,
      },
    });
  }

  async logHolidayOperation(
    operation: 'created' | 'updated' | 'deleted',
    holidayId: number,
    user_id: number,
    holidayName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.HOLIDAY_CREATED,
      updated: ActivityEvent.HOLIDAY_UPDATED,
      deleted: ActivityEvent.HOLIDAY_DELETED,
    };

    const descriptionMap = {
      created: 'Tạo ngày nghỉ lễ',
      updated: 'Cập nhật ngày nghỉ lễ',
      deleted: 'Xóa ngày nghỉ lễ',
    };

    await this.log({
      logName: 'Holiday Management',
      description: holidayName ? `${descriptionMap[operation]}: "${holidayName}"` : descriptionMap[operation],
      subjectType: SubjectType.HOLIDAY,
      event: eventMap[operation],
      subjectId: holidayId,
      causer_id: user_id,
      properties: {
        operation,
        holiday_name: holidayName,
        ...details,
      },
    });
  }

  async logMeetingRoomOperation(
    operation: 'created' | 'updated' | 'deleted',
    roomId: number,
    user_id: number,
    roomName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.MEETING_ROOM_CREATED,
      updated: ActivityEvent.MEETING_ROOM_UPDATED,
      deleted: ActivityEvent.MEETING_ROOM_DELETED,
    };

    const descriptionMap = {
      created: 'Tạo phòng họp',
      updated: 'Cập nhật phòng họp',
      deleted: 'Xóa phòng họp',
    };

    await this.log({
      logName: 'Meeting Room Management',
      description: roomName ? `${descriptionMap[operation]}: "${roomName}"` : descriptionMap[operation],
      subjectType: SubjectType.MEETING_ROOM,
      event: eventMap[operation],
      subjectId: roomId,
      causer_id: user_id,
      properties: {
        operation,
        room_name: roomName,
        ...details,
      },
    });
  }

  async logMeetingBookingOperation(
    operation: 'booked' | 'updated' | 'cancelled',
    bookingId: number,
    user_id: number,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      booked: ActivityEvent.MEETING_ROOM_BOOKED,
      updated: ActivityEvent.MEETING_ROOM_BOOKING_UPDATED,
      cancelled: ActivityEvent.MEETING_ROOM_BOOKING_CANCELLED,
    };

    const descriptionMap = {
      booked: 'Đặt phòng họp',
      updated: 'Cập nhật đặt phòng',
      cancelled: 'Hủy đặt phòng',
    };

    await this.log({
      logName: 'Meeting Booking',
      description: descriptionMap[operation],
      subjectType: SubjectType.MEETING_BOOKING,
      event: eventMap[operation],
      subjectId: bookingId,
      causer_id: user_id,
      properties: {
        operation,
        ...details,
      },
    });
  }

  async logAssetOperation(
    operation: 'created' | 'updated' | 'deleted' | 'assigned' | 'returned',
    assetId: number,
    user_id: number,
    assetName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.ASSET_CREATED,
      updated: ActivityEvent.ASSET_UPDATED,
      deleted: ActivityEvent.ASSET_DELETED,
      assigned: ActivityEvent.ASSET_ASSIGNED,
      returned: ActivityEvent.ASSET_RETURNED,
    };

    const descriptionMap = {
      created: 'Tạo tài sản',
      updated: 'Cập nhật tài sản',
      deleted: 'Xóa tài sản',
      assigned: 'Gán tài sản',
      returned: 'Thu hồi tài sản',
    };

    await this.log({
      logName: 'Asset Management',
      description: assetName ? `${descriptionMap[operation]}: "${assetName}"` : descriptionMap[operation],
      subjectType: SubjectType.ASSET,
      event: eventMap[operation],
      subjectId: assetId,
      causer_id: user_id,
      properties: {
        operation,
        asset_name: assetName,
        ...details,
      },
    });
  }

  async logAssetRequestOperation(
    operation: 'created' | 'approved' | 'rejected',
    requestId: number,
    user_id: number,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.ASSET_REQUEST_CREATED,
      approved: ActivityEvent.ASSET_REQUEST_APPROVED,
      rejected: ActivityEvent.ASSET_REQUEST_REJECTED,
    };

    const descriptionMap = {
      created: 'Tạo yêu cầu tài sản',
      approved: 'Phê duyệt yêu cầu tài sản',
      rejected: 'Từ chối yêu cầu tài sản',
    };

    await this.log({
      logName: 'Asset Request',
      description: descriptionMap[operation],
      subjectType: SubjectType.ASSET_REQUEST,
      event: eventMap[operation],
      subjectId: requestId,
      causer_id: user_id,
      properties: {
        operation,
        ...details,
      },
    });
  }

  async logProjectOperation(
    operation: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed' | 'progress_updated',
    projectId: number,
    user_id: number,
    projectName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.PROJECT_CREATED,
      updated: ActivityEvent.PROJECT_UPDATED,
      deleted: ActivityEvent.PROJECT_DELETED,
      member_added: ActivityEvent.PROJECT_MEMBER_ADDED,
      member_removed: ActivityEvent.PROJECT_MEMBER_REMOVED,
      progress_updated: ActivityEvent.PROJECT_PROGRESS_UPDATED,
    };

    const descriptionMap = {
      created: 'Tạo dự án',
      updated: 'Cập nhật dự án',
      deleted: 'Xóa dự án',
      member_added: 'Thêm thành viên dự án',
      member_removed: 'Xóa thành viên dự án',
      progress_updated: 'Cập nhật tiến độ dự án',
    };

    await this.log({
      logName: 'Project Management',
      description: projectName ? `${descriptionMap[operation]}: "${projectName}"` : descriptionMap[operation],
      subjectType: SubjectType.PROJECT,
      event: eventMap[operation],
      subjectId: projectId,
      causer_id: user_id,
      properties: {
        operation,
        project_name: projectName,
        ...details,
      },
    });
  }

  async logUserOperation(
    operation: 'created' | 'updated' | 'deleted' | 'password_changed' | 'password_reset',
    userId: number,
    causer_id: number,
    userEmail?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventMap = {
      created: ActivityEvent.USER_CREATED,
      updated: ActivityEvent.USER_UPDATED,
      deleted: ActivityEvent.USER_DELETED,
      password_changed: ActivityEvent.USER_PASSWORD_CHANGED,
      password_reset: ActivityEvent.USER_PASSWORD_RESET,
    };

    const descriptionMap = {
      created: 'Tạo người dùng mới',
      updated: 'Cập nhật thông tin người dùng',
      deleted: 'Xóa người dùng',
      password_changed: 'Đổi mật khẩu',
      password_reset: 'Đặt lại mật khẩu',
    };

    await this.log({
      logName: 'User Management',
      description: userEmail ? `${descriptionMap[operation]}: ${userEmail}` : descriptionMap[operation],
      subjectType: SubjectType.USER,
      event: eventMap[operation],
      subjectId: userId,
      causer_id: causer_id,
      properties: {
        operation,
        user_email: userEmail,
        ...details,
      },
    });
  }

  async getActivityLogs(options: {
    page?: number;
    limit?: number;
    logName?: string;
    event?: string;
    causer_id?: number;
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
    if (filters.causer_id) where.causer_id = filters.causer_id;
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
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Log admin self-approval for audit trail
   * SECURITY: This is logged for monitoring purposes
   */
  async logAdminSelfApproval(
    adminId: number,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.log({
      logName: 'request_admin_self_approval',
      description: `Admin tự phê duyệt request của chính mình`,
      subjectType: 'request',
      event: 'request.admin_self_approval',
      subjectId: metadata.requestId || adminId,
      causer_id: adminId,
      properties: {
        warning: 'ADMIN_SELF_APPROVAL',
        requires_review: true,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });

    // Optional: Send alert to HR Manager or senior management
    // await this.notificationService.alertHRManagers({
    //   type: 'ADMIN_SELF_APPROVAL',
    //   adminId,
    //   message: 'Admin self-approved their request',
    // });
  }
}
