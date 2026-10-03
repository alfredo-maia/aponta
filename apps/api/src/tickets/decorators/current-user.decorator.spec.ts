import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';

/**
 * `createParamDecorator`'s returned function IS the decorator (it mutates
 * class metadata when applied to a parameter) — it cannot be "called" with
 * an ExecutionContext directly. The standard NestJS pattern to unit-test
 * the underlying factory is to apply the decorator to a throwaway method,
 * then pull the factory back out of Nest's own ROUTE_ARGS_METADATA.
 */
function getParamDecoratorFactory(decorator: typeof CurrentUser) {
  class TestDecorator {
    public test(@decorator() _value: unknown) {
      return _value;
    }
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestDecorator, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser decorator', () => {
  it('extracts request.user from the execution context', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user: CurrentUserPayload = {
      id: 'user-1',
      email: 'jane@example.com',
      role: Role.AGENT,
      organizationId: null,
    };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    };

    const result = factory(undefined, ctx);

    expect(result).toEqual(user);
  });

  it('returns undefined when the request has no user (unauthenticated edge case)', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    const result = factory(undefined, ctx);

    expect(result).toBeUndefined();
  });
});
