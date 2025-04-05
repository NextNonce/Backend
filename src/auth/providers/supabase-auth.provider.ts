import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider } from '../interfaces/auth-provider.interface';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { plainToInstance } from 'class-transformer';
import { throwLogged } from '@/common/helpers/error.helper';

@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
    private supabaseClient: SupabaseClient;
    private readonly logger: AppLoggerService;

    constructor(readonly configService: ConfigService) {
        this.logger = new AppLoggerService(SupabaseAuthProvider.name);
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseKey = configService.get<string>('SUPABASE_KEY');

        if (supabaseUrl === undefined || supabaseKey === undefined) {
            this.logger.error('Supabase configuration is missing',);
            throwLogged(new InternalServerErrorException());
        }

        this.supabaseClient = new SupabaseClient(supabaseUrl, supabaseKey);
    }

    getName(): string {
        return 'Supabase';
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

    async deleteAuthUserById(id: string): Promise<void> {
        const { error } = await this.supabaseClient.auth.admin.deleteUser(id);
        if (error) {
            this.logger.error(
                `Failed to delete user by id: ${id}, with error: ${error.message}`,
            );
        }
        this.logger.log(`Deleted AuthUser with id: ${id}`);
    }
}
