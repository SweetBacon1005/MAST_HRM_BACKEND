import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ApproveNewsDto } from './dto/approve-news.dto';
import { NewsPaginationDto } from './dto/pagination-queries.dto';
import { NewsStatus } from '@prisma/client';
import { NEWS_ERRORS } from '../common/constants/error-messages.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuthorizationContext } from '../auth/services/authorization-context.service';

jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content: string) => content),
}));

describe('NewsController', () => {
  let controller: NewsController;
  let service: NewsService;

  const mockNewsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    submitForReview: jest.fn(),
    approveOrReject: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [
        {
          provide: NewsService,
          useValue: mockNewsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NewsController>(NewsController);
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
        ...createNewsDto,
        author_id,
        status: NewsStatus.DRAFT,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockNewsService.create.mockResolvedValue(mockNews);

      const result = await controller.create(createNewsDto, author_id);

      expect(service.create).toHaveBeenCalledWith(createNewsDto, author_id);
      expect(result).toEqual(mockNews);
    });
  });

  describe('findAll', () => {
    it('nên lấy danh sách tin tức thành công', async () => {
      const paginationDto: NewsPaginationDto = {
        page: 1,
        limit: 10,
      };
      const mockResult = {
        data: [
          {
            id: 1,
            title: 'Tin tức 1',
            content: 'Nội dung 1',
            authorName: 'Author',
            reviewerName: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          total_pages: 1,
        },
      };

      mockNewsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('nên lấy thông tin tin tức thành công', async () => {
      const id = 1;
      const viewerId = 1;
      const mockNews = {
        id,
        title: 'Tin tức',
        content: 'Nội dung',
        authorName: 'Author',
        reviewerName: null,
      };

      mockNewsService.findOne.mockResolvedValue(mockNews);

      const result = await controller.findOne(id, viewerId);

      expect(service.findOne).toHaveBeenCalledWith(id, viewerId);
      expect(result).toEqual(mockNews);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockNewsService.findOne.mockRejectedValue(
        new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND),
      );

      await expect(controller.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('nên cập nhật tin tức thành công', async () => {
      const id = 1;
      const user_id = 1;
      const updateNewsDto: UpdateNewsDto = {
        title: 'Tiêu đề mới',
      };
      const mockNews = {
        id,
        ...updateNewsDto,
        author_id: user_id,
        status: NewsStatus.DRAFT,
      };

      mockNewsService.update.mockResolvedValue(mockNews);

      const result = await controller.update(id, updateNewsDto, user_id);

      expect(service.update).toHaveBeenCalledWith(id, updateNewsDto, user_id);
      expect(result).toEqual(mockNews);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockNewsService.update.mockRejectedValue(
        new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND),
      );

      await expect(
        controller.update(999, { title: 'New' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên throw ForbiddenException khi không có quyền cập nhật', async () => {
      mockNewsService.update.mockRejectedValue(
        new ForbiddenException(NEWS_ERRORS.UNAUTHORIZED_UPDATE),
      );

      await expect(
        controller.update(1, { title: 'New' }, 1),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('nên xóa tin tức thành công', async () => {
      const id = 1;
      const user_id = 1;
      const mockAuthContext = {
        hasRole: jest.fn().mockReturnValue(false),
      } as unknown as AuthorizationContext;

      mockNewsService.remove.mockResolvedValue({
        message: NEWS_ERRORS.NEWS_DELETED_SUCCESS,
      });

      const result = await controller.remove(id, user_id, mockAuthContext);

      expect(service.remove).toHaveBeenCalledWith(id, user_id, false);
      expect(result.message).toBe(NEWS_ERRORS.NEWS_DELETED_SUCCESS);
    });

    it('nên cho phép admin xóa tin tức', async () => {
      const id = 1;
      const user_id = 1;
      const mockAuthContext = {
        hasRole: jest.fn().mockReturnValue(true),
      } as unknown as AuthorizationContext;

      mockNewsService.remove.mockResolvedValue({
        message: NEWS_ERRORS.NEWS_DELETED_SUCCESS,
      });

      const result = await controller.remove(id, user_id, mockAuthContext);

      expect(service.remove).toHaveBeenCalledWith(id, user_id, true);
      expect(result.message).toBe(NEWS_ERRORS.NEWS_DELETED_SUCCESS);
    });
  });

  describe('submitForReview', () => {
    it('nên gửi tin tức để duyệt thành công', async () => {
      const id = 1;
      const user_id = 1;
      const mockNews = {
        id,
        status: NewsStatus.PENDING,
        author_id: user_id,
      };

      mockNewsService.submitForReview.mockResolvedValue(mockNews);

      const result = await controller.submitForReview(id, user_id);

      expect(service.submitForReview).toHaveBeenCalledWith(id, user_id);
      expect(result).toEqual(mockNews);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockNewsService.submitForReview.mockRejectedValue(
        new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND),
      );

      await expect(
        controller.submitForReview(999, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveOrReject', () => {
    it('nên duyệt tin tức thành công', async () => {
      const id = 1;
      const reviewerId = 2;
      const approveNewsDto: ApproveNewsDto = {
        status: 'APPROVED',
      };
      const mockNews = {
        id,
        status: NewsStatus.APPROVED,
        reviewer_id: reviewerId,
      };

      mockNewsService.approveOrReject.mockResolvedValue(mockNews);

      const result = await controller.approveOrReject(id, approveNewsDto, reviewerId);

      expect(service.approveOrReject).toHaveBeenCalledWith(
        id,
        'APPROVED',
        reviewerId,
        undefined,
      );
      expect(result).toEqual(mockNews);
    });

    it('nên từ chối tin tức thành công', async () => {
      const id = 1;
      const reviewerId = 2;
      const approveNewsDto: ApproveNewsDto = {
        status: 'REJECTED',
        reason: 'Lý do từ chối',
      };
      const mockNews = {
        id,
        status: NewsStatus.REJECTED,
        reviewer_id: reviewerId,
        reason: approveNewsDto.reason,
      };

      mockNewsService.approveOrReject.mockResolvedValue(mockNews);

      const result = await controller.approveOrReject(id, approveNewsDto, reviewerId);

      expect(service.approveOrReject).toHaveBeenCalledWith(
        id,
        'REJECTED',
        reviewerId,
        approveNewsDto.reason,
      );
      expect(result).toEqual(mockNews);
    });

    it('nên throw NotFoundException khi không tìm thấy tin tức', async () => {
      mockNewsService.approveOrReject.mockRejectedValue(
        new NotFoundException(NEWS_ERRORS.NEWS_NOT_FOUND),
      );

      await expect(
        controller.approveOrReject(999, { status: 'APPROVED' }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

