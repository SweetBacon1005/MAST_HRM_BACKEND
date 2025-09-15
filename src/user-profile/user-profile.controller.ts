import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateChildDto } from './dto/create-child.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateUserCertificateDto } from './dto/create-user-certificate.dto';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import {
  CertificatePaginationDto,
  ChildrenPaginationDto,
  EducationPaginationDto,
  ExperiencePaginationDto,
  ReferencePaginationDto,
  UserSkillPaginationDto,
} from './dto/pagination-queries.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateUserCertificateDto } from './dto/update-user-certificate.dto';
import { UpdateUserInformationDto } from './dto/update-user-information.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UpdateAvatarDto } from './dto/upload-avatar.dto';
import { UserProfileService } from './user-profile.service';

@ApiTags('user-profile')
@Controller('user-profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  // ===== THÔNG TIN CÁ NHÂN =====
  @Get()
  @ApiOperation({ summary: 'Xem thông tin cá nhân của user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin cá nhân chi tiết',
  })
  async getUserProfile(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getUserProfile(userId);
  }

  @Patch('information')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thành công',
  })
  async updateUserInformation(
    @GetCurrentUser('id') userId: number,
    @Body() updateDto: UpdateUserInformationDto,
  ) {
    return await this.userProfileService.updateUserInformation(
      userId,
      updateDto,
    );
  }

  // ===== QUẢN LÝ CON CÁI =====
  @Post('children')
  @ApiOperation({ summary: 'Thêm thông tin con' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin con thành công',
  })
  async createChild(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateChildDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createChild(createDto);
  }

  @Get('children')
  @ApiOperation({ summary: 'Lấy danh sách con cái' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách con cái',
  })
  async getChildren(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getChildren(userId);
  }

  @Get('children/paginated')
  @ApiOperation({ summary: 'Lấy danh sách con cái có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách con cái có phân trang',
  })
  async getChildrenPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: ChildrenPaginationDto,
  ) {
    return await this.userProfileService.getChildrenPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('children/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin con' })
  @ApiParam({ name: 'id', description: 'ID của con' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateChild(
    @Param('id', ParseIntPipe) childId: number,
    @Body() updateDto: UpdateChildDto,
  ) {
    return await this.userProfileService.updateChild(childId, updateDto);
  }

  @Delete('children/:id')
  @ApiOperation({ summary: 'Xóa thông tin con' })
  @ApiParam({ name: 'id', description: 'ID của con' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteChild(@Param('id', ParseIntPipe) childId: number) {
    return await this.userProfileService.deleteChild(childId);
  }

  // ===== QUẢN LÝ HỌC VẤN =====
  @Post('education')
  @ApiOperation({ summary: 'Thêm thông tin học vấn' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin học vấn thành công',
  })
  async createEducation(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateEducationDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createEducation(createDto);
  }

  @Get('education')
  @ApiOperation({ summary: 'Lấy danh sách học vấn' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học vấn',
  })
  async getEducations(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getEducations(userId);
  }

  @Get('education/paginated')
  @ApiOperation({ summary: 'Lấy danh sách học vấn có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học vấn có phân trang',
  })
  async getEducationsPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: EducationPaginationDto,
  ) {
    return await this.userProfileService.getEducationsPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('education/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin học vấn' })
  @ApiParam({ name: 'id', description: 'ID của học vấn' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateEducation(
    @Param('id', ParseIntPipe) educationId: number,
    @Body() updateDto: UpdateEducationDto,
  ) {
    return await this.userProfileService.updateEducation(
      educationId,
      updateDto,
    );
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Xóa thông tin học vấn' })
  @ApiParam({ name: 'id', description: 'ID của học vấn' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteEducation(@Param('id', ParseIntPipe) educationId: number) {
    return await this.userProfileService.deleteEducation(educationId);
  }

  // ===== QUẢN LÝ KINH NGHIỆM =====
  @Post('experience')
  @ApiOperation({ summary: 'Thêm thông tin kinh nghiệm' })
  @ApiResponse({
    status: 201,
    description: 'Thêm thông tin kinh nghiệm thành công',
  })
  async createExperience(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateExperienceDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createExperience(createDto);
  }

  @Get('experience')
  @ApiOperation({ summary: 'Lấy danh sách kinh nghiệm' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kinh nghiệm',
  })
  async getExperiences(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getExperiences(userId);
  }

  @Get('experience/paginated')
  @ApiOperation({ summary: 'Lấy danh sách kinh nghiệm có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kinh nghiệm có phân trang',
  })
  async getExperiencesPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: ExperiencePaginationDto,
  ) {
    return await this.userProfileService.getExperiencesPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('experience/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin kinh nghiệm' })
  @ApiParam({ name: 'id', description: 'ID của kinh nghiệm' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateExperience(
    @Param('id', ParseIntPipe) experienceId: number,
    @Body() updateDto: UpdateExperienceDto,
  ) {
    return await this.userProfileService.updateExperience(
      experienceId,
      updateDto,
    );
  }

  @Delete('experience/:id')
  @ApiOperation({ summary: 'Xóa thông tin kinh nghiệm' })
  @ApiParam({ name: 'id', description: 'ID của kinh nghiệm' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteExperience(@Param('id', ParseIntPipe) experienceId: number) {
    return await this.userProfileService.deleteExperience(experienceId);
  }

  // ===== QUẢN LÝ CHỨNG CHỈ =====
  @Post('certificates')
  @ApiOperation({ summary: 'Thêm chứng chỉ' })
  @ApiResponse({
    status: 201,
    description: 'Thêm chứng chỉ thành công',
  })
  async createUserCertificate(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateUserCertificateDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createUserCertificate(createDto);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Lấy danh sách chứng chỉ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chứng chỉ',
  })
  async getUserCertificates(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getUserCertificates(userId);
  }

  @Get('certificates/paginated')
  @ApiOperation({ summary: 'Lấy danh sách chứng chỉ có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chứng chỉ có phân trang',
  })
  async getUserCertificatesPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: CertificatePaginationDto,
  ) {
    return await this.userProfileService.getUserCertificatesPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('certificates/:id')
  @ApiOperation({ summary: 'Cập nhật chứng chỉ' })
  @ApiParam({ name: 'id', description: 'ID của chứng chỉ' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateUserCertificate(
    @Param('id', ParseIntPipe) certificateId: number,
    @Body() updateDto: UpdateUserCertificateDto,
  ) {
    return await this.userProfileService.updateUserCertificate(
      certificateId,
      updateDto,
    );
  }

  @Delete('certificates/:id')
  @ApiOperation({ summary: 'Xóa chứng chỉ' })
  @ApiParam({ name: 'id', description: 'ID của chứng chỉ' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteUserCertificate(
    @Param('id', ParseIntPipe) certificateId: number,
  ) {
    return await this.userProfileService.deleteUserCertificate(certificateId);
  }

  // ===== QUẢN LÝ KỸ NĂNG =====
  @Post('skills')
  @ApiOperation({ summary: 'Thêm kỹ năng' })
  @ApiResponse({
    status: 201,
    description: 'Thêm kỹ năng thành công',
  })
  async createUserSkill(
    @GetCurrentUser('id') userId: number,
    @Body() createDto: CreateUserSkillDto,
  ) {
    createDto.user_id = userId;
    return await this.userProfileService.createUserSkill(createDto);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng của user' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng',
  })
  async getUserSkills(@GetCurrentUser('id') userId: number) {
    return await this.userProfileService.getUserSkills(userId);
  }

  @Get('skills/paginated')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng có phân trang',
  })
  async getUserSkillsPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: UserSkillPaginationDto,
  ) {
    return await this.userProfileService.getUserSkillsPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('skills/:id')
  @ApiOperation({ summary: 'Cập nhật kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  async updateUserSkill(
    @Param('id', ParseIntPipe) userSkillId: number,
    @Body() updateDto: UpdateUserSkillDto,
  ) {
    return await this.userProfileService.updateUserSkill(
      userSkillId,
      updateDto,
    );
  }

  @Delete('skills/:id')
  @ApiOperation({ summary: 'Xóa kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của user skill' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  async deleteUserSkill(@Param('id', ParseIntPipe) userSkillId: number) {
    return await this.userProfileService.deleteUserSkill(userSkillId);
  }

  @Get('skills/position/:positionId')
  @ApiOperation({ summary: 'Lấy danh sách kỹ năng theo vị trí' })
  @ApiParam({ name: 'positionId', description: 'ID của vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách kỹ năng theo vị trí',
  })
  async getSkillsByPosition(
    @Param('positionId', ParseIntPipe) positionId: number,
  ) {
    return await this.userProfileService.getSkillsByPosition(positionId);
  }

  // ===== CÁC DANH SÁCH THAM CHIẾU =====
  @Get('references/positions')
  @ApiOperation({ summary: 'Lấy danh sách vị trí' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vị trí',
  })
  async getPositions() {
    return await this.userProfileService.getPositions();
  }

  @Get('references/positions/paginated')
  @ApiOperation({ summary: 'Lấy danh sách vị trí có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vị trí có phân trang',
  })
  async getPositionsPaginated(@Query() paginationDto: ReferencePaginationDto) {
    return await this.userProfileService.getPositionsPaginated(paginationDto);
  }

  @Get('references/offices')
  @ApiOperation({ summary: 'Lấy danh sách văn phòng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách văn phòng',
  })
  async getOffices() {
    return await this.userProfileService.getOffices();
  }

  @Get('references/roles')
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vai trò',
  })
  async getRoles() {
    return await this.userProfileService.getRoles();
  }

  @Get('references/levels')
  @ApiOperation({ summary: 'Lấy danh sách cấp độ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cấp độ',
  })
  async getLevels() {
    return await this.userProfileService.getLevels();
  }

  @Get('references/languages')
  @ApiOperation({ summary: 'Lấy danh sách ngôn ngữ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách ngôn ngữ',
  })
  async getLanguages() {
    return await this.userProfileService.getLanguages();
  }

  // ===== CẬP NHẬT AVATAR =====
  @Patch('avatar')
  @ApiOperation({ summary: 'Cập nhật avatar URL từ S3' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật avatar thành công',
  })
  async updateAvatar(
    @GetCurrentUser('id') userId: number,
    @Body() updateAvatarDto: UpdateAvatarDto,
  ) {
    return await this.userProfileService.updateAvatar(
      userId,
      updateAvatarDto.avatar_url,
    );
  }
}
