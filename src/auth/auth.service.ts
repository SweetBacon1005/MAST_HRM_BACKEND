import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const tokens = await this.getTokens(Number(user.id), user.email);
    return tokens;
  }

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const tokens = await this.getTokens(Number(user.id), user.email);
    return tokens;
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokensDto> {
    try {
      const payload = await this.jwtService.verify(
        refreshTokenDto.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.sub !== refreshTokenDto.userId) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const user = await this.usersService.findById(refreshTokenDto.userId);
      if (!user) {
        throw new UnauthorizedException('User không tồn tại');
      }

      const tokens = await this.getTokens(Number(user.id), user.email);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: 'Đăng xuất thành công' };
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }
    const { password, ...result } = user;
    return result;
  }

  private async getTokens(userId: number, email: string): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
