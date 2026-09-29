import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock };
  let usersService: { create: jest.Mock; findByEmail: jest.Mock };

  const mockSafeUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'AGENT',
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ access_token: 'signed-jwt-token' }),
    };
    usersService = {
      create: jest.fn().mockResolvedValue(mockSafeUser),
      findByEmail: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  describe('login', () => {
    it('should return an access token for an authenticated request', async () => {
      const req = { user: mockSafeUser };

      const result = await controller.login(req as never);

      expect(authService.login).toHaveBeenCalledWith(mockSafeUser);
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });
  });

  describe('register', () => {
    it('should create a new user and return it without the password', async () => {
      const dto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'plain-password',
      };

      const result = await controller.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSafeUser);
      expect(result).not.toHaveProperty('password');
    });
  });
});
