import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, Prisma } from '@prisma/client';
import * as DOMPurify from 'isomorphic-dompurify';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { NEWS_ERRORS } from '../common/constants/error-messages.constants';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private sanitizeHtmlContent(content: string): string {
    const cleanContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'blockquote',
        'code',
        'pre',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
    });

    return cleanContent;
  }

  async create(createNewsDto: CreateNewsDto, author_id: number) {
    const sanitizedContent = this.sanitizeHtmlContent(createNewsDto.content);

    const news = await this.prisma.news.create({
      data: {
        ...createNewsDto,
        content: sanitizedContent,
        author_id: author_id,
        status: NewsStatus.DRAFT,
      },
    });

    return news;
  }

  async findAll(paginationDto: NewsPaginationDto) {
    const {
      page = 1,
      limit = 10,
      status,
      author_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = paginationDto;

    const skip = (page - 1) * limit;

    const whereConditions: Prisma.newsWhereInput = {
      deleted_at: null,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (author_id) {
      whereConditions.author_id = author_id;
    }

    if (search) {
      whereConditions.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const orderBy: Prisma.newsOrderByWithRelationInput = {};
    if (sort_by === 'title') {
      orderBy.title = sort_order;
    } else if (sort_by === 'updated_at') {
      orderBy.updated_at = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [news, total] = await Promise.all([
      this.prisma.news.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true, avatar: true } },
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true, avatar: true } },
            },
          },
        },
      }),
      this.prisma.news.count({ where: whereConditions }),
    ]);

    const transformedNews = news.map((n) => ({
      ...n,
      authorName: n.author.user_information?.name || n.author.email,
      reviewerName:
        n.reviewer?.user_information?.name || n.reviewer?.email || null,
    }));

    return {
      data: transformedNews,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, viewerId?: number) {
    const news = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true, avatar: true } },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true, avatar: true } },
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (viewerId && viewerId !== news.author_id) {
    }

    return {
      ...news,
      authorName: news.author.user_information?.name || news.author.email,
      reviewerName:
        news.reviewer?.user_information?.name || news.reviewer?.email || null,
    };
  }

  async update(id: number, updateNewsDto: UpdateNewsDto, user_id: number) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.author_id !== user_id) {
      throw new ForbiddenException(NEWS_ERRORS.UNAUTHORIZED_UPDATE);
    }

    if (
      existingNews.status !== NewsStatus.DRAFT &&
      existingNews.status !== NewsStatus.REJECTED
    ) {
      throw new BadRequestException(NEWS_ERRORS.CANNOT_UPDATE_STATUS);
    }

    const sanitizedContent = updateNewsDto.content
      ? this.sanitizeHtmlContent(updateNewsDto.content)
      : existingNews.content;

    const updatedNews = await this.prisma.news.update({
      where: { id },
      data: {
        ...updateNewsDto,
        content: sanitizedContent,
      },
    });

    return updatedNews;
  }

  async submitForReview(id: number, user_id: number) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.author_id !== user_id) {
      throw new ForbiddenException(NEWS_ERRORS.UNAUTHORIZED_SUBMIT);
    }

    if (
      existingNews.status !== NewsStatus.DRAFT &&
      existingNews.status !== NewsStatus.REJECTED
    ) {
      throw new BadRequestException(NEWS_ERRORS.CANNOT_SUBMIT_STATUS);
    }

    const updatedNews = await this.prisma.news.update({
      where: { id },
      data: {
        status: NewsStatus.PENDING,
        reviewer_id: null,
        reviewed_at: null,
      },
    });

    return updatedNews;
  }

  async approveOrReject(
    id: number,
    status: 'APPROVED' | 'REJECTED',
    reviewerId: number,
    reason?: string,
  ) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.status !== NewsStatus.PENDING) {
      throw new BadRequestException(NEWS_ERRORS.CANNOT_REVIEW_STATUS);
    }

    const updatedNews = await this.prisma.news.update({
      where: { id },
      data: {
        reason: reason,
        status: status as NewsStatus,
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
      },
    });

    if (status === 'APPROVED') {
      try {
        await this.notificationsService.create(
          {
            title: updatedNews.title,
            content: `Tin tức "${updatedNews.title}" đã được phê duyệt`,
            news_id: updatedNews.id,
          },
          reviewerId,
        );
      } catch {
        // Silently fail notification creation
      }
    }

    return updatedNews;
  }

  async remove(id: number, user_id: number, role: string[]) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (
      existingNews.author_id !== user_id ||
      (!role.includes(ROLE_NAMES.ADMIN))
    ) {
      throw new ForbiddenException(NEWS_ERRORS.UNAUTHORIZED_DELETE);
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user_notifications.updateMany({
        where: {
          notification: {
            news_id: id,
            deleted_at: null,
          },
          deleted_at: null,
        },
        data: { deleted_at: now },
      }),
      this.prisma.notifications.updateMany({
        where: { 
          news_id: id,
          deleted_at: null 
        },
        data: { deleted_at: now },
      }),
      this.prisma.news.update({
        where: { id },
        data: { deleted_at: now },
      }),
    ]);

    return { message: NEWS_ERRORS.NEWS_DELETED_SUCCESS };
  }
}
