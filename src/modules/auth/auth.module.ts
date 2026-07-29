import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import {
  EMAIL_SENDER,
  OTP_STORE,
  SESSION_REPOSITORY,
  SMS_SENDER,
  SOCIAL_TOKEN_VERIFIER,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '@/modules/auth/ports';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { RoleEntity } from '@/infra/persistence/postgres/auth/role.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { UserIdentityEntity } from '@/infra/persistence/postgres/auth/user-identity.entity';
import { UserRoleEntity } from '@/infra/persistence/postgres/auth/user-role.entity';
import { UserSessionEntity } from '@/infra/persistence/postgres/auth/user-session.entity';
import { TypeOrmUserRepository } from '@/infra/persistence/postgres/auth/typeorm-user.repository';
import { TypeOrmSessionRepository } from '@/infra/persistence/postgres/auth/typeorm-session.repository';
import { RedisOtpStore } from '@/infra/persistence/redis/redis-otp.store';
import { JwtTokenService } from '@/infra/auth/jwt-token.service';
import { ConsoleSmsSender } from '@/infra/auth/console-sms.sender';
import { ConsoleEmailSender } from '@/infra/auth/console-email.sender';
import { NodemailerEmailSender } from '@/infra/auth/nodemailer-email.sender';
import { StubSocialTokenVerifier } from '@/infra/auth/stub-social-token.verifier';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RedisModule } from '@/infra/redis/redis.module';
import { UserSessionCleanupService } from '@/modules/auth/user-session-cleanup.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      CustomerEntity,
      RoleEntity,
      UserRoleEntity,
      UserSessionEntity,
      UserIdentityEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    UserSessionCleanupService,
    ConsoleEmailSender,
    NodemailerEmailSender,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: SESSION_REPOSITORY, useClass: TypeOrmSessionRepository },
    { provide: OTP_STORE, useClass: RedisOtpStore },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: SMS_SENDER, useClass: ConsoleSmsSender },
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, ConsoleEmailSender, NodemailerEmailSender],
      useFactory: (
        config: ConfigService,
        consoleEmailSender: ConsoleEmailSender,
        nodemailerEmailSender: NodemailerEmailSender,
      ) => {
        const smtpUser = config.get<string>('smtp.user');
        const smtpAppPassword = config.get<string>('smtp.appPassword');
        return smtpUser && smtpAppPassword ? nodemailerEmailSender : consoleEmailSender;
      },
    },
    { provide: SOCIAL_TOKEN_VERIFIER, useClass: StubSocialTokenVerifier },
  ],
  exports: [AuthService, TOKEN_SERVICE, AuthGuard],
})
export class AuthModule {}
