import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  NEWS_ERRORS,
  NOTIFICATION_ERRORS,
} from '../common/constants/error-messages.constants';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  CreateNotificationResponseDto,
  UpdateNotificationResponseDto,
  MarkReadResponseDto,
  DeleteNotificationResponseDto,
  CreateWithRawSQLResponseDto,
} from './dto/notification-action-response.dto';
import { NotificationListResponseDto } from './dto/notification-list-response.dto';
import { AdminNotificationDetailResponseDto } from './dto/admin-notification-response.dto';
import { UserNotificationDetailResponseDto } from './dto/user-notification-response.dto';

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
        const notification = await tx.notifications.create({
          data: {
            title: createNotificationDto.title,
            content: createNotificationDto.content,
            news_id: createNotificationDto.news_id,
            created_by: creatorId,
          },
        });

        const targetUsers = await tx.users.findMany({
          where: { deleted_at: null },
          select: { id: true },
        });

        if (targetUsers.length > 0) {
          await this.createWithRawSQL({
            title: createNotificationDto.title,
            content: createNotificationDto.content,
            news_id: createNotificationDto.news_id,
          });
        }

        return {
          notification,
          message: `Đã tạo thông báo cho ${targetUsers.length} người dùng`,
          count: targetUsers.length,
          newsTitle: news?.title,
        };
      },
      { timeout: 20000 },
    );
  }

  async findAll(
    paginationDto: NotificationPaginationDto,
    userId: number,
    isAdmin: boolean = false,
  ): Promise<NotificationListResponseDto> {
    const {
      page = 1,
      limit = 10,
      is_read,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = paginationDto;

    const skip = (page - 1) * limit;

    if (isAdmin) {
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
        const { user_notifications, ...notificationWithoutUserNotifications } =
          n;
        return {
          ...notificationWithoutUserNotifications,
          creatorName:
            (n.creator?.user_information?.name ?? n.creator?.email ?? 'System'),
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
    } else {
      const whereConditions: Prisma.user_notificationsWhereInput = {
        user_id: userId,
        deleted_at: null,
        notification: {
          deleted_at: null,
        },
      };

      if (is_read !== undefined) {
        whereConditions.is_read = is_read;
      }

      if (search) {
        whereConditions.OR = [
          {
            notification: {
              title: { contains: search },
            },
          },
          {
            notification: {
              content: { contains: search },
            },
          },
        ];
      }

      const orderBy: Prisma.user_notificationsOrderByWithRelationInput = {};
      if (sortBy === 'title') {
        orderBy.notification = { title: sortOrder };
      } else if (sortBy === 'updated_at') {
        orderBy.updated_at = sortOrder;
      } else {
        orderBy.created_at = sortOrder;
      }

      const [userNotifications, total] = await Promise.all([
        this.prisma.user_notifications.findMany({
          where: whereConditions,
          skip,
          take: limit,
          orderBy,
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
        }),
        this.prisma.user_notifications.count({ where: whereConditions }),
      ]);

      const transformedNotifications = userNotifications.map((un) => ({
        id: un.id,
        notification_id: un.notification_id,
        title: un.notification.title,
        content: un.notification.content,
        is_read: un.is_read,
        read_at: un.read_at,
        created_at: un.created_at,
        updated_at: un.updated_at,
        creatorName:
          (un.notification.creator?.user_information?.name ?? 
           un.notification.creator?.email ?? 
           'System'),
        newsTitle: un.notification.news?.title || null,
        news_id: un.notification.news_id,
      }));

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
  }

  async findOne(
    id: number,
    userId: number,
    isAdmin: boolean = false,
  ): Promise<
    AdminNotificationDetailResponseDto | UserNotificationDetailResponseDto
  > {
    if (isAdmin) {
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

      await this.activityLogService.logNotificationOperation(
        'viewed',
        notification.id,
        userId,
        notification.title,
        {
          is_admin_view: true,
          recipient_count: notification.user_notifications.length,
        },
      );

      return {
        ...notification,
        creatorName:
          (notification.creator?.user_information?.name ?? 
           notification.creator?.email ?? 
           'System'),
        newsTitle: notification.news?.title || null,
        recipients: notification.user_notifications.map((un) => ({
          user_id: un.user_id,
          userName: (un.user.user_information?.name ?? un.user.email),
          is_read: un.is_read,
          read_at: un.read_at,
        })),
      };
    } else {
      const userNotification = await this.prisma.user_notifications.findFirst({
        where: {
          notification_id: id,
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
      });

      if (!userNotification) {
        throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
      }

      await this.activityLogService.logNotificationOperation(
        'viewed',
        userNotification.notification_id,
        userId,
        userNotification.notification.title,
        {
          is_admin_view: false,
          is_read: userNotification.is_read,
        },
      );

      return {
        id: userNotification.id,
        notification_id: userNotification.notification_id,
        title: userNotification.notification.title,
        content: userNotification.notification.content,
        is_read: userNotification.is_read,
        read_at: userNotification.read_at,
        created_at: userNotification.created_at,
        updated_at: userNotification.updated_at,
        creatorName:
          (userNotification.notification.creator?.user_information?.name ?? 
           userNotification.notification.creator?.email ?? 
           'System'),
        newsTitle: userNotification.notification.news?.title || null,
        news_id: userNotification.notification.news_id,
      };
    }
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
    notificationId: number,
    userId: number,
    isRead: boolean,
    isAdmin: boolean = false,
  ): Promise<MarkReadResponseDto> {
    if (isAdmin) {
      throw new BadRequestException(
        'Admin không thể đánh dấu đã đọc cho user khác',
      );
    }

    const userNotification = await this.prisma.user_notifications.findFirst({
      where: {
        notification_id: notificationId,
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
      notificationId,
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
    isAdmin: boolean = false,
  ): Promise<DeleteNotificationResponseDto> {
    if (isAdmin) {
      const existingNotification = await this.prisma.notifications.findFirst({
        where: { id: notificationId, deleted_at: null },
      });

      if (!existingNotification) {
        throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
      }

      const now = new Date();

      await this.prisma.$transaction([
        this.prisma.notifications.update({
          where: { id: notificationId },
          data: { deleted_at: now },
        }),
        this.prisma.user_notifications.updateMany({
          where: {
            notification_id: notificationId,
            deleted_at: null,
          },
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
    } else {
      const userNotification = await this.prisma.user_notifications.findFirst({
        where: {
          notification_id: notificationId,
          user_id: userId,
          deleted_at: null,
        },
        include: {
          notification: {
            select: { title: true },
          },
        },
      });

      if (!userNotification) {
        throw new NotFoundException(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
      }

      await this.prisma.user_notifications.update({
        where: { id: userNotification.id },
        data: { deleted_at: new Date() },
      });

      await this.activityLogService.logNotificationOperation(
        'deleted',
        notificationId,
        userId,
        userNotification.notification.title,
        {
          is_admin_delete: false,
          cascade_deleted: false,
          is_read: userNotification.is_read,
        },
      );

      return { message: NOTIFICATION_ERRORS.NOTIFICATION_DELETED_SUCCESS };
    }
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
