import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  NEWS_ERRORS,
  NOTIFICATION_ERRORS,
} from '../common/constants/error-messages.constants';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../database/prisma.service';
import { AdminNotificationDetailResponseDto } from './dto/admin-notification-response.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  CreateNotificationResponseDto,
  CreateWithRawSQLResponseDto,
  DeleteNotificationResponseDto,
  MarkReadResponseDto,
  UpdateNotificationResponseDto,
} from './dto/notification-action-response.dto';
import { NotificationListResponseDto } from './dto/notification-list-response.dto';
import { NotificationPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  UserNotificationDetailResponseDto,
  UserNotificationResponseDto,
} from './dto/user-notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
    creatorId?: number,
  ): Promise<CreateNotificationResponseDto> {
    let news: any;
    if (createNotificationDto.news_id) {
      news = await this.prisma.news.findUnique({
        where: { id: createNotificationDto.news_id },
      });
      if (!news) {
        throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
      }
    }
    return await this.prisma.$transaction(
      async (tx) => {
        const targetUsers = await tx.users.findMany({
          where: { deleted_at: null },
          select: { id: true },
        });

        let createNotification: any;
        if (targetUsers.length > 0) {
          createNotification = await this.createWithRawSQL(
            {
              title: createNotificationDto.title,
              content: createNotificationDto.content,
              news_id: createNotificationDto.news_id,
            },
            creatorId,
          );
        }

        return {
          ...createNotification,
          newsTitle: news?.title,
        };
      },
      { timeout: 20000 },
    );
  }

  async findAll(userId: number): Promise<UserNotificationResponseDto[]> {
    const notifications = await this.prisma.user_notifications.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        notification: {
          deleted_at: null,
        },
      },
      include: {
        notification: {
          include: {
            creator: {
              select: {
                id: true,
                email: true,
                user_information: { select: { name: true } },
              },
            },
            news: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return notifications.map((un) => ({
      id: un.id,
      notification_id: un.notification_id,
      title: un.notification.title,
      content: un.notification.content,
      is_read: un.is_read,
      read_at: un.read_at,
      created_at: un.created_at,
      updated_at: un.updated_at,
      creatorName:
        un.notification.creator?.user_information?.name ??
        un.notification.creator?.email ??
        'System',
      newsTitle: un.notification.news?.title || null,
      news_id: un.notification.news_id,
    }));
  }

  async findAllForAdmin(
    paginationDto: NotificationPaginationDto,
  ): Promise<NotificationListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = paginationDto;

    const skip = (page - 1) * limit;

    const whereConditions: Prisma.notificationsWhereInput = {
      deleted_at: null,
    };

    if (search) {
      whereConditions.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const orderBy: Prisma.notificationsOrderByWithRelationInput = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'updated_at') {
      orderBy.updated_at = sortOrder;
    } else {
      orderBy.created_at = sortOrder;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
          news: {
            select: { id: true, title: true },
          },
          user_notifications: {
            select: {
              user_id: true,
              is_read: true,
              read_at: true,
            },
          },
        },
      }),
      this.prisma.notifications.count({ where: whereConditions }),
    ]);

    const transformedNotifications = notifications.map((n) => {
      const { user_notifications, ...notificationWithoutUserNotifications } = n;
      return {
        ...notificationWithoutUserNotifications,
        creatorName:
          n.creator?.user_information?.name ?? n.creator?.email ?? 'System',
        newsTitle: n.news?.title || null,
        totalRecipients: user_notifications.length,
        readCount: user_notifications.filter((un) => un.is_read).length,
      };
    });

    return {
      data: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: number,
  ): Promise<
    AdminNotificationDetailResponseDto | UserNotificationDetailResponseDto
  > {
    const notification = await this.prisma.notifications.findFirst({
      where: { id, deleted_at: null },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        news: {
          select: { id: true, title: true },
        },
        user_notifications: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    }

    return {
      ...notification,
      creatorName:
        notification.creator?.user_information?.name ??
        notification.creator?.email ??
        'System',
      newsTitle: notification.news?.title || null,
      recipients: notification.user_notifications.map((un) => ({
        user_id: un.user_id,
        userName: un.user.user_information?.name ?? un.user.email,
        is_read: un.is_read,
        read_at: un.read_at,
      })),
    };
  }

  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<UpdateNotificationResponseDto> {
    const existingNotification = await this.prisma.notifications.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNotification) {
      throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    }

    const updatedNotification = await this.prisma.notifications.update({
      where: { id },
      data: updateNotificationDto,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        news: {
          select: { id: true, title: true },
        },
      },
    });

    if (existingNotification.created_by) {
      await this.activityLogService.logNotificationOperation(
        'updated',
        updatedNotification.id,
        existingNotification.created_by,
        updatedNotification.title,
        {
          changes: updateNotificationDto,
          previous_title: existingNotification.title,
        },
      );
    }

    return updatedNotification;
  }

  async markAsRead(
    userNotificationId: number,
    userId: number,
    isRead: boolean,
  ): Promise<MarkReadResponseDto> {
    const userNotification = await this.prisma.user_notifications.findFirst({
      where: {
        id: userNotificationId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!userNotification) {
      throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    }

    const updatedUserNotification = await this.prisma.user_notifications.update(
      {
        where: { id: userNotification.id },
        data: {
          is_read: isRead,
          read_at: isRead ? new Date() : null,
        },
        include: {
          notification: {
            select: { title: true },
          },
        },
      },
    );

    await this.activityLogService.logNotificationOperation(
      isRead ? 'read' : 'unread',
      userNotificationId,
      userId,
      updatedUserNotification.notification.title,
      {
        previous_read_status: userNotification.is_read,
        new_read_status: isRead,
      },
    );

    return updatedUserNotification;
  }

  async remove(
    notificationId: number,
    userId: number,
  ): Promise<DeleteNotificationResponseDto> {
    const existingNotification = await this.prisma.notifications.findFirst({
      where: { id: notificationId, deleted_at: null },
    });

    if (!existingNotification) {
      throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user_notifications.updateMany({
        where: {
          notification_id: notificationId,
          deleted_at: null,
        },
        data: { deleted_at: now },
      }),
      this.prisma.notifications.update({
        where: { id: notificationId },
        data: { deleted_at: now },
      }),
    ]);

    await this.activityLogService.logNotificationOperation(
      'deleted',
      notificationId,
      userId,
      existingNotification.title,
      {
        is_admin_delete: true,
        cascade_deleted: true,
        created_by: existingNotification.created_by,
      },
    );

    return { message: NOTIFICATION_ERRORS.NOTIFICATION_DELETED_SUCCESS };
  }

  async createWithRawSQL(
    createNotificationDto: CreateNotificationDto,
    creatorId?: number,
  ): Promise<CreateWithRawSQLResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const notification = await tx.notifications.create({
        data: {
          title: createNotificationDto.title,
          content: createNotificationDto.content,
          news_id: createNotificationDto.news_id,
          created_by: creatorId,
        },
      });

      await tx.$executeRaw`
          INSERT INTO user_notifications (notification_id, user_id, created_at, updated_at)
          SELECT ${notification.id}, id, NOW(), NOW()
          FROM users 
          WHERE deleted_at IS NULL
        `;

      const userCount = await tx.users.count({
        where: { deleted_at: null },
      });

      return {
        notification,
        message: `Đã tạo thông báo cho ${userCount} người dùng (Raw SQL)`,
        count: userCount,
      };
    });
  }
}
