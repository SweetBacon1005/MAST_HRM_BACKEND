import { ApprovalStatus as PrismaApprovalStatus } from '@prisma/client';
/**
 * Loại timesheet
 */
export enum TimesheetType {
  NORMAL = 'NORMAL', // Ngày làm việc bình thường
  OVERTIME = 'OVERTIME', // Làm thêm giờ
  HOLIDAY = 'HOLIDAY', // Ngày lễ
}

/**
 * Workflow transitions cho timesheet state
 */
export class ApprovalStatusManager {
  /**
   * Kiểm tra xem có thể chuyển từ state này sang state khác không
   */
  static canTransition(
    from: PrismaApprovalStatus,
    to: PrismaApprovalStatus,
  ): boolean {
    const validTransitions: Record<
      PrismaApprovalStatus,
      PrismaApprovalStatus[]
    > = {
      [PrismaApprovalStatus.PENDING]: [
        PrismaApprovalStatus.APPROVED,
        PrismaApprovalStatus.REJECTED,
      ],
      [PrismaApprovalStatus.APPROVED]: [PrismaApprovalStatus.REJECTED],
      [PrismaApprovalStatus.REJECTED]: [PrismaApprovalStatus.APPROVED],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Kiểm tra xem timesheet có thể chỉnh sửa không
   */
  static canEdit(state: PrismaApprovalStatus): boolean {
    return (
      [
        PrismaApprovalStatus.PENDING,
        PrismaApprovalStatus.REJECTED,
      ] as PrismaApprovalStatus[]
    ).includes(state);
  }

  /**
   * Kiểm tra xem timesheet có thể xóa không
   */
  static canDelete(state: PrismaApprovalStatus): boolean {
    return (
      [
        PrismaApprovalStatus.PENDING,
        PrismaApprovalStatus.REJECTED,
      ] as PrismaApprovalStatus[]
    ).includes(state);
  }

  /**
   * Lấy tên trạng thái
   */
  static getStateName(state: PrismaApprovalStatus): string {
    const names = {
      [PrismaApprovalStatus.PENDING]: 'Chờ duyệt',
      [PrismaApprovalStatus.APPROVED]: 'Đã duyệt',
      [PrismaApprovalStatus.REJECTED]: 'Bị từ chối',
    };

    return names[state] || 'Không xác định';
  }
}
