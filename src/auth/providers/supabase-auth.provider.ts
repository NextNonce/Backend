import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider } from '../interfaces/auth-provider.interface';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService} from '@/app-logger/app-logger.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
    private supabaseClient: SupabaseClient;
    private readonly logger = new AppLoggerService(SupabaseAuthProvider.name);

    constructor(readonly configService: ConfigService) {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseKey = configService.get<string>('SUPABASE_KEY');

        if (supabaseUrl === undefined || supabaseKey === undefined) {
            throw new Error('Supabase configuration is missing');
        }

        this.supabaseClient = new SupabaseClient(supabaseUrl, supabaseKey);
    }

    async getAuthUserByJwt(jwt: string): Promise<AuthUserDto | undefined> {
        const { data, error } = await this.supabaseClient.auth.getUser(jwt);
        if (error) {
            this.logger.error(`Failed to get user by jwt: ${jwt}`);
            throw error;
        }
        if (!data) {
            this.logger.error(`No user found for jwt: ${jwt}`);
            return undefined;
        }
        this.logger.log(`Got user by jwt: ${jwt}`);

        return plainToInstance(AuthUserDto, data.user, {
            excludeExtraneousValues: true,
        });
    }
}
