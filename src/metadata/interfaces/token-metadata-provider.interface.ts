import { ExternalTokenMetadataDto } from '@/metadata/dto/external-token-metadata.dto';

export const TOKEN_METADATA_PROVIDER = Symbol('TOKEN_METADATA_PROVIDER');

export interface TokenMetadataProvider {
    /**
     * Given a wallet address and an array of chain names,
     * return metadata for tokens that the wallet owns on those chains.
     * @param walletAddress
     * @param chainNames
     */
    getByWalletAddress(
        walletAddress: string,
        chainNames: string[],
    ): Promise<ExternalTokenMetadataDto[] | undefined>;
}
