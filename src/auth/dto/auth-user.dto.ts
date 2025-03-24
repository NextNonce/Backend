import { Expose } from 'class-transformer';

export class AuthUserDto {
    @Expose()
    id: string;

    @Expose()
    email?: string;

    @Expose()
    created_at: string;

    @Expose()
    updated_at?: string;
}
