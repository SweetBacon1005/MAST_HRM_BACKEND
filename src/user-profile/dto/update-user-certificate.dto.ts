import { PartialType } from '@nestjs/swagger';
import { CreateUserCertificateDto } from './create-user-certificate.dto';

export class UpdateUserCertificateDto extends PartialType(
  CreateUserCertificateDto,
) {}
