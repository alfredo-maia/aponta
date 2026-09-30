import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

// Mock do nodemailer
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('MailService', () => {
  let service: MailService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    mockSendMail.mockClear();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.gmail.com';
        if (key === 'SMTP_PORT') return 587;
        if (key === 'SMTP_USER') return 'bot@aponta.com';
        if (key === 'SMTP_PASS') return 'secret';
        if (key === 'SMTP_FROM') return '"Aponta" <bot@aponta.com>';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('sendMail', () => {
    it('should format and send an email via nodemailer transport', async () => {
      mockSendMail.mockResolvedValueOnce('success');

      await service.sendEmail({
        to: 'client@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Aponta" <bot@aponta.com>',
        to: 'client@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
        html: undefined,
      });
    });

    it('gracefully handles missing credentials / transporter failure', async () => {
      // Simulate production missing password to avoid throwing and crashing the app
      configService.get.mockReturnValue(null); 
      // Emulating a fail gracefully log strategy - or we can throw. Let's say we expect it to not crash if SMTP is unconfigured.
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));
      
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await service.sendEmail({
        to: 'client@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
      });

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
