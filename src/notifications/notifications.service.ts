import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  NEWS_ERRORS,
  NOTIFICATION_ERRORS,
} from '../common/constants/error-messages.constants';
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
import { AdminNotificationPaginationDto, UserNotificationPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  UserNotificationDetailResponseDto,
  UserNotificationResponseDto,
} from './dto/user-notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
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
          news_title: news?.title,
        };
      },
      { timeout: 20000 },
    );
  }

  async findAll(
    user_id: number,
    paginationDto: UserNotificationPaginationDto,
  ): Promise<{
    data: UserNotificationResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = paginationDto;

    const skip = (page - 1) * limit;

    const whereConditions: Prisma.user_notificationsWhereInput = {
      user_id: user_id,
      deleted_at: null,
      notification: {
        deleted_at: null,
      },
    };

    const orderBy: Prisma.user_notificationsOrderByWithRelationInput = {};
    if (sort_by === 'title') {
      orderBy.notification = { title: sort_order };
    } else if (sort_by === 'updated_at') {
      orderBy.updated_at = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [user_notifications, total] = await Promise.all([
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

    const data = user_notifications.map((un) => ({
      id: un.id,
      notification_id: un.notification_id,
      title: un.notification.title,
      content: un.notification.content,
      is_read: un.is_read,
      read_at: un.read_at,
      created_at: un.created_at,
      updated_at: un.updated_at,
      creator_name:
        un.notification.creator?.user_information?.name ??
        un.notification.creator?.email ??
        'System',
      news_title: un.notification.news?.title || null,
      news_id: un.notification.news_id,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForAdmin(
    paginationDto: AdminNotificationPaginationDto,
  ): Promise<NotificationListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
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
    if (sort_by === 'title') {
      orderBy.title = sort_order;
    } else if (sort_by === 'updated_at') {
      orderBy.updated_at = sort_order;
    } else {
      orderBy.created_at = sort_order;
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
        creator_name:
          n.creator?.user_information?.name ?? n.creator?.email ?? 'System',
        news_title: n.news?.title || null,
        total_recipients: user_notifications.length,
        read_count: user_notifications.filter((un) => un.is_read).length,
      };
    });

    return {
      data: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
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
      creator_name:
        notification.creator?.user_information?.name ??
        notification.creator?.email ??
        'System',
      news_title: notification.news?.title || null,
      recipients: notification.user_notifications.map((un) => ({
        user_id: un.user_id,
        user_name: un.user.user_information?.name ?? un.user.email,
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
    }
    return updatedNotification;
  }

  async markAsRead(
    userNotificationId: number,
    user_id: number,
    isRead: boolean,
  ): Promise<MarkReadResponseDto> {
    const userNotification = await this.prisma.user_notifications.findFirst({
      where: {
        id: userNotificationId,
        user_id: user_id,
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

    return updatedUserNotification;
  }

  async remove(
    notificationId: number,
    user_id: number,
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
