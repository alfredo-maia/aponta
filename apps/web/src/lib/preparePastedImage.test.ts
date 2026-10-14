import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PASTED_IMAGE_MAX_EDGE,
  preparePastedImage,
  scaleToFit,
} from './preparePastedImage';

describe('scaleToFit', () => {
  it('keeps dimensions that already fit the max edge', () => {
    expect(scaleToFit(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('scales a landscape screenshot down by the longest edge', () => {
    expect(scaleToFit(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it('scales a portrait screenshot down by the longest edge', () => {
    expect(scaleToFit(1080, 2400, 1600)).toEqual({ width: 720, height: 1600 });
  });
});

describe('preparePastedImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the original file when createImageBitmap is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const original = new File(['bytes'], 'image.png', { type: 'image/png' });
    await expect(preparePastedImage(original)).resolves.toBe(original);
  });

  it('returns the original file when decode fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));
    const original = new File(['not-an-image'], 'image.png', { type: 'image/png' });
    await expect(preparePastedImage(original)).resolves.toBe(original);
  });

  it('downscales and recompresses an oversized screenshot to jpeg', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 3200, height: 1800, close: vi.fn() }),
    );
    const drawImage = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage })) as never;
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
      cb(new Blob([new Uint8Array(120)], { type: 'image/jpeg' }));
    };

    const original = new File([new Uint8Array(400_000)], 'image.png', { type: 'image/png' });
    const prepared = await preparePastedImage(original);

    expect(prepared).not.toBe(original);
    expect(prepared.type).toBe('image/jpeg');
    expect(prepared.name).toMatch(/\.jpg$/);
    expect(drawImage).toHaveBeenCalled();
    expect(drawImage.mock.calls[0][3]).toBe(PASTED_IMAGE_MAX_EDGE);
    expect(drawImage.mock.calls[0][4]).toBe(900);
  });

  it('leaves a small jpeg untouched', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }),
    );
    const original = new File([new Uint8Array(12_000)], 'shot.jpg', { type: 'image/jpeg' });
    await expect(preparePastedImage(original)).resolves.toBe(original);
  });
});
