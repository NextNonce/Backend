import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { ChainModule } from '@/chain/chain.module';
import { TOKEN_METADATA_PROVIDER } from '@/metadata/interfaces/token-metadata-provider.interface';
import { DuneTokenMetadataProvider } from '@/metadata/providers/dune-token-metadata.provider';

@Module({
    imports: [ChainModule],
    providers: [
        {
            provide: TOKEN_METADATA_PROVIDER,
            useClass: DuneTokenMetadataProvider,
        },
        MetadataService,
    ],
    exports: [MetadataService],
})
export class MetadataModule {}
