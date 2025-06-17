import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly tokenExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    private static readonly logger = new AppLoggerService(JwtStrategy.name);
    constructor(
        readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            JwtStrategy.logger.error('JWT_SECRET is not defined');
            throwLogged(
                new InternalServerErrorException('Internal server error'),
            );
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: { sub: string }) {
        JwtStrategy.logger.log(`Validating user with id: ${payload.sub}`);
        const token = this.tokenExtractor(req);
        if (!token) {
            throw new UnauthorizedException('Missing JWT');
        }
        const authUser = await this.authService.getAuthUserByToken(token);

        if (authUser.id !== payload.sub) {
            throw new UnauthorizedException('Invalid token');
        }
        //this.logger.log(`Got authUser: ${JSON.stringify(authUser)}`);
        return authUser;
    }
}
