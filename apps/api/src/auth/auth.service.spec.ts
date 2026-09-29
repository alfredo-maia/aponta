import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock; toSafeUser: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const mockUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: '',
    role: Role.AGENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.password = await bcrypt.hash('correct-password', 10);

    usersService = {
      findByEmail: jest.fn(),
      toSafeUser: jest.fn((user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _password, ...safeUser } = user;
        return safeUser;
      }),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateUser(
        'jane@example.com',
        'correct-password',
      );

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
      // Consistency: validateUser should delegate password-stripping to
      // UsersService.toSafeUser rather than re-implementing it inline.
      expect(usersService.toSafeUser).toHaveBeenCalledWith(mockUser);
    });

    it('should return null when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateUser(
        'jane@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await authService.validateUser(
        'nobody@example.com',
        'whatever',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return JWT token on login', async () => {
      const validatedUser = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      const result = await authService.login(validatedUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: validatedUser.id,
        email: validatedUser.email,
        role: validatedUser.role,
      });
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });
  });
});
