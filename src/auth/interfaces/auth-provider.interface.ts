import { AuthUserDto } from '@/auth/dto/auth-user.dto';

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
export interface AuthProvider {
    getName(): string;
    getAuthUserByJwt(jwt: string): Promise<AuthUserDto | undefined>;
    deleteAuthUserById(id: string): Promise<void>;
}
