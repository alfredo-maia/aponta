import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO for the public, unauthenticated registration endpoint.
 *
 * Deliberately does NOT expose a `role` field: allowing a client-supplied
 * role on a public endpoint would let any anonymous caller self-register as
 * ADMIN (privilege escalation). Public registration always results in the
 * default role assigned by AuthService/UsersService, regardless of what the
 * caller sends.
 */
export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
