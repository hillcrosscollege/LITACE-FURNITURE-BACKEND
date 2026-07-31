import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    example: 'Registration successful. Please verify your email.',
  })
  message: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string; // returned in response during dev; will be sent via email in prod
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}
