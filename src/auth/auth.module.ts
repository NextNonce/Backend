import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SupabaseAuthProvider } from './providers/supabase-auth.provider';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { AUTH_PROVIDER } from '@/auth/interfaces/auth-provider.interface';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: AUTH_PROVIDER, // 👈 interface token
            useClass: SupabaseAuthProvider, // 👈 concrete implementation
        },
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
    ],
    exports: [AuthService],
})
export class AuthModule {}
