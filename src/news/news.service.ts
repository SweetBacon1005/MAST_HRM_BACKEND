import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, Prisma, roles } from '@prisma/client';
import * as DOMPurify from 'isomorphic-dompurify';
import { NEWS_ERRORS } from '../common/constants/error-messages.constants';
import { PrismaService } from '../database/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ROLE_NAMES } from '../auth/constants/role.constants';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(createNewsDto: CreateNewsDto, authorId: number) {
    const sanitizedContent = this.sanitizeHtmlContent(createNewsDto.content);

    const news = await this.prisma.news.create({
      data: {
        ...createNewsDto,
        content: sanitizedContent,
        author_id: authorId,
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
      authorId,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = paginationDto;

    const skip = (page - 1) * limit;

    const whereConditions: Prisma.newsWhereInput = {
      deleted_at: null,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (authorId) {
      whereConditions.author_id = authorId;
    }

    if (search) {
      whereConditions.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const orderBy: Prisma.newsOrderByWithRelationInput = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'updated_at') {
      orderBy.updated_at = sortOrder;
    } else {
      orderBy.created_at = sortOrder;
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
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

    return {
      ...news,
      authorName: news.author.user_information?.name || news.author.email,
      reviewerName:
        news.reviewer?.user_information?.name || news.reviewer?.email || null,
    };
  }

  async update(id: number, updateNewsDto: UpdateNewsDto, userId: number) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.author_id !== userId) {
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

  async submitForReview(id: number, userId: number) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.author_id !== userId) {
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

    return updatedNews;
  }

  async remove(id: number, userId: number, role: string) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id, deleted_at: null },
    });

    if (!existingNews) {
      throw new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND);
    }

    if (existingNews.author_id !== userId || role !== ROLE_NAMES.ADMIN && role !== ROLE_NAMES.SUPER_ADMIN && role !== ROLE_NAMES.COMPANY_OWNER) {
      throw new ForbiddenException(NEWS_ERRORS.UNAUTHORIZED_DELETE);
    }

    const deletedNews = await this.prisma.news.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    return { message: NEWS_ERRORS.NEWS_DELETED_SUCCESS };
  }
}
