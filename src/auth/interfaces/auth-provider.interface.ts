import { AuthUserDto} from '@/auth/dto/auth-user.dto';

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
export interface AuthProvider {
    getAuthUserByJwt(jwt: string): Promise<AuthUserDto | undefined>;
}
