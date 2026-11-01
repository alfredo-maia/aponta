import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  ensurePrivateKnowledgeUploadsDir,
  getPrivateKnowledgeUploadsDir,
  isSafeStoredFilename,
} from './private-uploads';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('private-uploads', () => {
  const originalEnv = process.env.KNOWLEDGE_PRIVATE_UPLOADS_DIR;

  afterEach(() => {
    process.env.KNOWLEDGE_PRIVATE_UPLOADS_DIR = originalEnv;
    jest.clearAllMocks();
  });

  describe('getPrivateKnowledgeUploadsDir', () => {
    it('defaults to uploads-private/knowledge outside process.cwd(), never under ./uploads', () => {
      delete process.env.KNOWLEDGE_PRIVATE_UPLOADS_DIR;

      const dir = getPrivateKnowledgeUploadsDir();

      expect(dir).toBe(join(process.cwd(), 'uploads-private/knowledge'));
      expect(dir).not.toContain(join(process.cwd(), 'uploads') + '/');
    });

    it('honors KNOWLEDGE_PRIVATE_UPLOADS_DIR when set', () => {
      process.env.KNOWLEDGE_PRIVATE_UPLOADS_DIR = '/srv/aponta-knowledge';

      expect(getPrivateKnowledgeUploadsDir()).toBe('/srv/aponta-knowledge');
    });
  });

  describe('ensurePrivateKnowledgeUploadsDir', () => {
    it('creates the directory recursively when it does not exist yet', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      ensurePrivateKnowledgeUploadsDir();

      expect(mkdirSync).toHaveBeenCalledWith(
        getPrivateKnowledgeUploadsDir(),
        { recursive: true },
      );
    });

    it('does not try to create the directory again when it already exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      ensurePrivateKnowledgeUploadsDir();

      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('isSafeStoredFilename', () => {
    it('accepts a normal server-generated filename', () => {
      expect(isSafeStoredFilename('3f9c7b1a-aaaa-bbbb-cccc-dddddddddddd.png')).toBe(true);
    });

    it('rejects path traversal via ".."', () => {
      expect(isSafeStoredFilename('../../etc/passwd')).toBe(false);
    });

    it('rejects a filename containing a path separator', () => {
      expect(isSafeStoredFilename('sub/dir/file.png')).toBe(false);
      expect(isSafeStoredFilename('sub\\dir\\file.png')).toBe(false);
    });

    it('rejects empty or non-string values', () => {
      expect(isSafeStoredFilename('')).toBe(false);
      expect(isSafeStoredFilename(undefined as unknown as string)).toBe(false);
    });
  });
});
