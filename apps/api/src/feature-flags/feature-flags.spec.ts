import { FeatureFlag, flagProblems, resolveFlags, FEATURE_FLAGS } from './feature-flags';
import { FeatureFlagsController } from './feature-flags.controller';

const flag = (changes: Partial<FeatureFlag> = {}): FeatureFlag => ({
  key: 'new-board',
  description: 'Novo quadro de tickets',
  owner: 'alfredo',
  defaultValue: false,
  removeBy: '2027-01-31',
  ...changes,
});

describe('feature flags', () => {
  describe('resolveFlags', () => {
    it('uses the default when the environment says nothing', () => {
      expect(resolveFlags([flag()], {})).toEqual({ 'new-board': false });
    });

    it('lets the environment turn a flag on or off', () => {
      expect(resolveFlags([flag()], { FEATURE_NEW_BOARD: 'true' })).toEqual({ 'new-board': true });
      expect(resolveFlags([flag({ defaultValue: true })], { FEATURE_NEW_BOARD: 'false' })).toEqual({
        'new-board': false,
      });
    });

    it('ignores a value that is neither true nor false', () => {
      expect(resolveFlags([flag({ defaultValue: true })], { FEATURE_NEW_BOARD: 'yes' })).toEqual({
        'new-board': true,
      });
    });

    it('ignores environment variables of flags that are not registered', () => {
      expect(resolveFlags([flag()], { FEATURE_OTHER: 'true' })).toEqual({ 'new-board': false });
    });
  });

  describe('flagProblems', () => {
    const today = new Date('2026-11-10T12:00:00Z');

    it('accepts a flag with owner, description and a future removal date', () => {
      expect(flagProblems([flag()], today)).toEqual([]);
    });

    it('reports a flag past its removal date', () => {
      expect(flagProblems([flag({ removeBy: '2026-11-09' })], today)).toEqual([
        'new-board: passou da data de remoção (2026-11-09)',
      ]);
    });

    it('reports a flag without owner or description, an invalid key and an invalid date', () => {
      const problems = flagProblems(
        [flag({ owner: '' }), flag({ key: 'Bad_Key' }), flag({ key: 'other', removeBy: 'soon' })],
        today,
      );
      expect(problems).toEqual([
        'new-board: sem responsável ou descrição',
        'Bad_Key: chave fora do padrão kebab-case',
        'other: data de remoção inválida (soon)',
      ]);
    });

    it('reports a key registered twice', () => {
      expect(flagProblems([flag(), flag()], today)).toEqual(['new-board: chave duplicada']);
    });

    it('the registered flags of this build have no problems today', () => {
      expect(flagProblems(FEATURE_FLAGS, new Date())).toEqual([]);
    });
  });

  describe('FeatureFlagsController', () => {
    it('answers the resolved value of every registered flag', () => {
      const controller = new FeatureFlagsController([flag()], { FEATURE_NEW_BOARD: 'true' });
      expect(controller.list()).toEqual({ 'new-board': true });
    });
  });
});
