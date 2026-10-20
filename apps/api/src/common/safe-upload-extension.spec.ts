import { resolveSafeUploadExtension } from './safe-upload-extension';

describe('resolveSafeUploadExtension', () => {
  it.each([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/webp', '.webp'],
    ['application/pdf', '.pdf'],
    ['text/plain', '.txt'],
    ['application/zip', '.zip'],
    ['application/msword', '.doc'],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.docx',
    ],
  ])('maps %s to %s', (mimeType, expected) => {
    expect(resolveSafeUploadExtension(mimeType)).toBe(expected);
  });

  it('never trusts a client-supplied extension embedded in the MIME string', () => {
    expect(resolveSafeUploadExtension('text/plain; evil=".html"')).toBe('.bin');
  });

  it('falls back to a generic, non-renderable extension for an unknown MIME type', () => {
    expect(resolveSafeUploadExtension('application/x-sh')).toBe('.bin');
  });
});
