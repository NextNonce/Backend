import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { UserInterceptor } from '@/user/interceptors/user.interceptor';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [UserController],
    providers: [UserService, UserInterceptor],
    exports: [UserService, UserInterceptor],
})
export class UserModule {}
