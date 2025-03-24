import { AuthUserDto} from '@/auth/dto/auth-user.dto';

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
export interface AuthProvider {
    /**
     * Validates the given token.
     * Returns an object containing user information if valid, or null otherwise.
     */
    //validateToken(token: string): Promise<{ providerUid: string } | undefined>;
    //getUserByProviderUid(providerUid: string): Promise<AuthUser | undefined>;
    getAuthUserByJwt(jwt: string): Promise<AuthUserDto | undefined>;
}
