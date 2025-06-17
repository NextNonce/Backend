import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '@/auth/auth.module';
import { UserInterceptor } from '@/user/interceptors/user.interceptor';
import { PortfolioModule } from '@/portfolio/portfolio.module';

@Module({
    imports: [AuthModule, PortfolioModule],
    controllers: [UserController],
    providers: [UserService, UserInterceptor],
    exports: [UserService, UserInterceptor],
})
export class UserModule {}
