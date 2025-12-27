import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsPaginationDto } from './dto/pagination-queries.dto';
import { NewsStatus } from '@prisma/client';
import { NEWS_ERRORS } from '../common/constants/error-messages.constants';

jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content: string) => content),
}));

describe('NewsService', () => {
  let service: NewsService;

  const mockPrismaService = {
    news: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user_notifications: {
      updateMany: jest.fn(),
    },
    notifications: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('nên tạo tin tức thành công', async () => {
      const createNewsDto: CreateNewsDto = {
        title: 'Tin tức mới',
        content: '<p>Nội dung tin tức</p>',
      };
      const author_id = 1;
      const mockNews = {
        id: 1,
        title: createNewsDto.title,
        content: createNewsDto.content,
        author_id,
        status: NewsStatus.DRAFT,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      mockPrismaService.news.create.mockResolvedValue(mockNews);

      const result = await service.create(createNewsDto, author_id);

      expect(mockPrismaService.news.create).toHaveBeenCalledWith({
        data: {
          ...createNewsDto,
          content: expect.any(String),
          author_id,
          status: NewsStatus.DRAFT,
        },
      });
      expect(result).toEqual(mockNews);
    });
  });

  describe('findAll', () => {
    it('nên lấy danh sách tin tức có phân trang', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockNews = [
        {
          id: 1,
          title: 'Tin tức 1',
          content: 'Nội dung 1',
          author: {
            id: 1,
            email: 'author@example.com',
            user_information: { name: 'Author', avatar: null },
          },
          reviewer: null,
        },
      ];
      const total = 1;

      mockPrismaService.news.findMany.mockResolvedValue(mockNews);
      mockPrismaService.news.count.mockResolvedValue(total);

      const result = await service.findAll(paginationDto);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('nên lọc theo status', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
        status: NewsStatus.PENDING,
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: NewsStatus.PENDING,
          }),
        }),
      );
    });

    it('nên lọc theo author_id', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
        author_id: 1,
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            author_id: 1,
          }),
        }),
      );
    });

    it('nên tìm kiếm theo search', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'test' } },
              { content: { contains: 'test' } },
            ]),
          }),
        }),
      );
    });

    it('nên sắp xếp theo title', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
        sort_by: 'title',
        sort_order: 'asc',
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        }),
      );
    });

    it('nên sắp xếp theo updated_at', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
        sort_by: 'updated_at',
        sort_order: 'desc',
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updated_at: 'desc' },
        }),
      );
    });

    it('nên sắp xếp theo created_at mặc định', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
      };

      mockPrismaService.news.findMany.mockResolvedValue([]);
      mockPrismaService.news.count.mockResolvedValue(0);

      await service.findAll(paginationDto);

      expect(mockPrismaService.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('nên tìm thấy tin tức theo id', async () => {
      const id = 1;
      const mockNews = {
        id,
        title: 'Tin tức',
        content: 'Nội dung',
        author: {
          id: 1,
          email: 'author@example.com',
          user_information: { name: 'Author', avatar: null },
        },
        reviewer: null,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(mockNews);

      const result = await service.findOne(id);

      expect(result).toEqual(expect.objectContaining({
        id,
        title: mockNews.title,
        authorName: 'Author',
      }));
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockPrismaService.news.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(NEWS_ERRORS.NEWS_NOT_FOUND);
    });

    it('nên trả về tin tức với reviewer name', async () => {
      const id = 1;
      const mockNews = {
        id,
        title: 'Tin tức',
        content: 'Nội dung',
        author: {
          id: 1,
          email: 'author@example.com',
          user_information: { name: 'Author', avatar: null },
        },
        reviewer: {
          id: 2,
          email: 'reviewer@example.com',
          user_information: { name: 'Reviewer', avatar: null },
        },
      };

      mockPrismaService.news.findUnique.mockResolvedValue(mockNews);

      const result = await service.findOne(id);

      expect(result.reviewerName).toBe('Reviewer');
    });

    it('nên trả về email khi không có user_information', async () => {
      const id = 1;
      const mockNews = {
        id,
        title: 'Tin tức',
        content: 'Nội dung',
        author: {
          id: 1,
          email: 'author@example.com',
          user_information: null,
        },
        reviewer: null,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(mockNews);

      const result = await service.findOne(id);

      expect(result.authorName).toBe('author@example.com');
    });

    it('nên xử lý viewerId khi khác author_id', async () => {
      const id = 1;
      const viewerId = 2;
      const mockNews = {
        id,
        title: 'Tin tức',
        content: 'Nội dung',
        author_id: 1,
        author: {
          id: 1,
          email: 'author@example.com',
          user_information: { name: 'Author', avatar: null },
        },
        reviewer: null,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(mockNews);

      const result = await service.findOne(id, viewerId);

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('nên cập nhật tin tức thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateNewsDto: UpdateNewsDto = {
        title: 'Tiêu đề mới',
      };
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.DRAFT,
        content: 'Nội dung cũ',
      };
      const updatedNews = {
        ...existingNews,
        ...updateNewsDto,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      const result = await service.update(id, updateNewsDto, user_id);

      expect(result).toEqual(updatedNews);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockPrismaService.news.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { title: 'New' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải author', async () => {
      const existingNews = {
        id: 1,
        author_id: 2,
        status: NewsStatus.DRAFT,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.update(1, { title: 'New' }, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, { title: 'New' }, 1),
      ).rejects.toThrow(NEWS_ERRORS.UNAUTHORIZED_UPDATE);
    });

    it('nên throw BadRequestException khi status không phải DRAFT hoặc REJECTED', async () => {
      const existingNews = {
        id: 1,
        author_id: 1,
        status: NewsStatus.PENDING,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.update(1, { title: 'New' }, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { title: 'New' }, 1),
      ).rejects.toThrow(NEWS_ERRORS.CANNOT_UPDATE_STATUS);
    });

    it('nên sanitize content khi cập nhật', async () => {
      const id = 1;
      const user_id = 1;
      const updateNewsDto: UpdateNewsDto = {
        content: '<script>alert("xss")</script><p>Safe content</p>',
      };
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.DRAFT,
        content: 'Old content',
      };
      const updatedNews = {
        ...existingNews,
        ...updateNewsDto,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      await service.update(id, updateNewsDto, user_id);

      expect(mockPrismaService.news.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.any(String),
          }),
        }),
      );
    });

    it('nên cập nhật thành công khi status là REJECTED', async () => {
      const id = 1;
      const user_id = 1;
      const updateNewsDto: UpdateNewsDto = {
        title: 'Tiêu đề mới',
      };
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.REJECTED,
        content: 'Nội dung cũ',
      };
      const updatedNews = {
        ...existingNews,
        ...updateNewsDto,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      const result = await service.update(id, updateNewsDto, user_id);

      expect(result).toEqual(updatedNews);
    });

    it('nên giữ nguyên content khi không cập nhật content', async () => {
      const id = 1;
      const user_id = 1;
      const updateNewsDto: UpdateNewsDto = {
        title: 'Tiêu đề mới',
      };
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.DRAFT,
        content: 'Nội dung cũ',
      };
      const updatedNews = {
        ...existingNews,
        ...updateNewsDto,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      await service.update(id, updateNewsDto, user_id);

      expect(mockPrismaService.news.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Nội dung cũ',
          }),
        }),
      );
    });
  });

  describe('submitForReview', () => {
    it('nên gửi tin tức để duyệt thành công', async () => {
      const id = 1;
      const user_id = 1;
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.DRAFT,
      };
      const updatedNews = {
        ...existingNews,
        status: NewsStatus.PENDING,
        reviewer_id: null,
        approved_at: null,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      const result = await service.submitForReview(id, user_id);

      expect(result.status).toBe(NewsStatus.PENDING);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockPrismaService.news.findUnique.mockResolvedValue(null);

      await expect(
        service.submitForReview(999, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải author', async () => {
      const existingNews = {
        id: 1,
        author_id: 2,
        status: NewsStatus.DRAFT,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.submitForReview(1, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên throw BadRequestException khi status không phải DRAFT hoặc REJECTED', async () => {
      const existingNews = {
        id: 1,
        author_id: 1,
        status: NewsStatus.PENDING,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.submitForReview(1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên gửi để duyệt thành công khi status là REJECTED', async () => {
      const id = 1;
      const user_id = 1;
      const existingNews = {
        id,
        author_id: user_id,
        status: NewsStatus.REJECTED,
      };
      const updatedNews = {
        ...existingNews,
        status: NewsStatus.PENDING,
        reviewer_id: null,
        approved_at: null,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      const result = await service.submitForReview(id, user_id);

      expect(result.status).toBe(NewsStatus.PENDING);
    });
  });

  describe('approveOrReject', () => {
    it('nên duyệt tin tức thành công', async () => {
      const id = 1;
      const reviewerId = 2;
      const existingNews = {
        id,
        status: NewsStatus.PENDING,
        title: 'Tin tức',
      };
      const updatedNews = {
        ...existingNews,
        status: NewsStatus.APPROVED,
        reviewer_id: reviewerId,
        approved_at: new Date(),
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);
      mockNotificationsService.create.mockResolvedValue({});

      const result = await service.approveOrReject(id, 'APPROVED', reviewerId);

      expect(result.status).toBe(NewsStatus.APPROVED);
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('nên từ chối tin tức thành công', async () => {
      const id = 1;
      const reviewerId = 2;
      const reason = 'Lý do từ chối';
      const existingNews = {
        id,
        status: NewsStatus.PENDING,
      };
      const updatedNews = {
        ...existingNews,
        status: NewsStatus.REJECTED,
        reviewer_id: reviewerId,
        reason,
        approved_at: new Date(),
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);

      const result = await service.approveOrReject(id, 'REJECTED', reviewerId, reason);

      expect(result.status).toBe(NewsStatus.REJECTED);
      expect(result.reason).toBe(reason);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockPrismaService.news.findUnique.mockResolvedValue(null);

      await expect(
        service.approveOrReject(999, 'APPROVED', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw BadRequestException khi status không phải PENDING', async () => {
      const existingNews = {
        id: 1,
        status: NewsStatus.DRAFT,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.approveOrReject(1, 'APPROVED', 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên xử lý lỗi khi tạo notification thất bại', async () => {
      const id = 1;
      const reviewerId = 2;
      const existingNews = {
        id,
        status: NewsStatus.PENDING,
        title: 'Tin tức',
      };
      const updatedNews = {
        ...existingNews,
        status: NewsStatus.APPROVED,
        reviewer_id: reviewerId,
        approved_at: new Date(),
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.news.update.mockResolvedValue(updatedNews);
      mockNotificationsService.create.mockRejectedValue(new Error('Notification error'));

      const result = await service.approveOrReject(id, 'APPROVED', reviewerId);

      expect(result.status).toBe(NewsStatus.APPROVED);
    });
  });

  describe('remove', () => {
    it('nên xóa tin tức thành công', async () => {
      const id = 1;
      const user_id = 1;
      const existingNews = {
        id,
        author_id: user_id,
      };
      const now = new Date();

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.$transaction.mockImplementation(async (operations) => {
        return Promise.all(operations.map((op: any) => op));
      });
      mockPrismaService.user_notifications.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.notifications.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.news.update.mockResolvedValue({ ...existingNews, deleted_at: now });

      const result = await service.remove(id, user_id, false);

      expect(result.message).toBe(NEWS_ERRORS.NEWS_DELETED_SUCCESS);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockPrismaService.news.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(999, 1, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không phải author và không phải admin', async () => {
      const existingNews = {
        id: 1,
        author_id: 2,
      };

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);

      await expect(
        service.remove(1, 1, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên cho phép admin xóa tin tức', async () => {
      const id = 1;
      const existingNews = {
        id,
        author_id: 2,
      };
      const now = new Date();

      mockPrismaService.news.findUnique.mockResolvedValue(existingNews);
      mockPrismaService.$transaction.mockImplementation(async (operations) => {
        return Promise.all(operations.map((op: any) => op));
      });
      mockPrismaService.user_notifications.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.notifications.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.news.update.mockResolvedValue({ ...existingNews, deleted_at: now });

      const result = await service.remove(id, 1, true);

      expect(result.message).toBe(NEWS_ERRORS.NEWS_DELETED_SUCCESS);
    });
  });
});

