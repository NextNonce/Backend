import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { ChainModule } from '@/chain/chain.module';
@Module({
    imports: [ChainModule],
    providers: [TokenService],
    exports: [TokenService],
})
export class TokenModule {}
