import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72) // bcrypt/argon2 input length sanity limit
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
