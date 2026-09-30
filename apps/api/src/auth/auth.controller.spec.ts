import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock };
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    changePassword: jest.Mock;
    updateProfile: jest.Mock;
    findById: jest.Mock;
    toSafeUser: jest.Mock;
  };

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
      changePassword: jest.fn().mockResolvedValue(undefined),
      updateProfile: jest.fn().mockResolvedValue(mockSafeUser),
      findById: jest.fn().mockResolvedValue(mockSafeUser),
      toSafeUser: jest.fn().mockReturnValue(mockSafeUser),
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

      expect(usersService.create).toHaveBeenCalledWith({
        ...dto,
        role: 'CLIENT',
      });
      expect(result).toEqual(mockSafeUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should always register with CLIENT role, ignoring any client-supplied role', async () => {
      // RegisterDto has no `role` field, but simulate an attacker who
      // manages to smuggle one onto the parsed object (e.g. before a
      // global ValidationPipe strips it) — the controller must never
      // forward it to UsersService.create.
      const maliciousDto = {
        name: 'Attacker',
        email: 'attacker@example.com',
        password: 'plain-password',
        role: 'ADMIN',
      } as unknown as { name: string; email: string; password: string };

      await controller.register(maliciousDto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CLIENT' }),
      );
      expect(usersService.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });
  });

  describe('changePassword', () => {
    it('calls usersService.changePassword with the authenticated user id', async () => {
      const req = { user: mockSafeUser };
      const dto = { currentPassword: 'old-pass', newPassword: 'new-pass-123' };

      const result = await controller.changePassword(req as never, dto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockSafeUser.id,
        dto.currentPassword,
        dto.newPassword,
      );
      expect(result).toEqual({ message: 'Password updated successfully' });
    });
  });

  describe('getProfile', () => {
    it('returns the full safe user record for the authenticated user id', async () => {
      usersService.findById = jest.fn().mockResolvedValue(mockSafeUser);
      const req = { user: mockSafeUser };

      const result = await controller.getProfile(req as never);

      expect(usersService.findById).toHaveBeenCalledWith(mockSafeUser.id);
      expect(result).toEqual(mockSafeUser);
    });
  });

  describe('updateProfile', () => {
    it('calls usersService.updateProfile with the authenticated user id and returns the updated user', async () => {
      const req = { user: mockSafeUser };
      const dto = { name: 'Jane Updated', email: 'jane.updated@example.com' };
      const updatedUser = { ...mockSafeUser, ...dto };
      usersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(req as never, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockSafeUser.id,
        dto,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});
