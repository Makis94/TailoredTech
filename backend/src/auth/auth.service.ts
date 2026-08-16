import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name.trim() },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Same error for "no such user" and "wrong password" so we don't leak
    // which emails are registered.
    const invalidCredentials = () =>
      new UnauthorizedException('Invalid email or password');
    if (!user) throw invalidCredentials();

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw invalidCredentials();

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: { id: string; email: string; name: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
