import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/core/common/enums/roles.enum';
import { User } from './entity/user.entity';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // ─── Internal helpers ────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  /**
   * Same as findByEmail but also SELECTs the password column
   * (needed for login credential check — password has select:false).
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Registration ────────────────────────────────────────────────────────────

  async createCustomer(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = this.usersRepo.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: passwordHash,
      phone: data.phone,
      role: Role.CUSTOMER,
    });

    return this.usersRepo.save(user);
  }

  // ─── Email verification ───────────────────────────────────────────────────────

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { isEmailVerified: true });
  }

  async updatePassword(
    userId: string,
    newHashedPassword: string,
  ): Promise<void> {
    await this.usersRepo.update(userId, {
      password: newHashedPassword,
      refreshTokenHash: null, // invalidate all sessions
    });
  }

  // ─── Refresh token ────────────────────────────────────────────────────────────

  async setRefreshTokenHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await this.usersRepo.update(userId, { refreshTokenHash: hash });
  }

  /**
   * Loads user WITH refreshTokenHash (select:false field).
   * Only used internally by JwtRefreshStrategy.
   */
  async usersRepo_findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.refresh_token_hash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { lastLoginAt: new Date() });
  }

  // ─── Password ─────────────────────────────────────────────────────────────────

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
