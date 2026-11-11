import { VersionController } from './version.controller';

describe('VersionController', () => {
  const original = process.env['APONTA_COMMIT'];
  afterEach(() => {
    if (original === undefined) delete process.env['APONTA_COMMIT'];
    else process.env['APONTA_COMMIT'] = original;
  });

  it('answers the commit the image was built from', () => {
    process.env['APONTA_COMMIT'] = 'a'.repeat(40);
    expect(new VersionController().version()).toEqual({ commit: 'a'.repeat(40) });
  });

  it('answers "unknown" for a build without a commit', () => {
    delete process.env['APONTA_COMMIT'];
    expect(new VersionController().version()).toEqual({ commit: 'unknown' });
  });
});
