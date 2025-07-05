import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import {
    TOKEN_METADATA_PROVIDER,
    TokenMetadataProvider,
} from '@/metadata/interfaces/token-metadata-provider.interface';
import { Chain, Prisma } from '@prisma/client';
import { ExternalTokenMetadataDto } from '@/metadata/dto/external-token-metadata.dto';
import { ChainService } from '@/chain/chain.service';
import {
    RawTokenMetadata,
    TokenIdentifier,
    TokenWithDetails,
    TokenWithMetadata,
} from '@/token/types/token.types';
import { toTokenWithMetadata } from '@/token/utils/token.utils';
import { v4 as uuidv4 } from 'uuid';
import {
    CACHE_TTL_FOUR_WEEKS,
    CACHE_TTL_ONE_DAY,
    CACHE_TTL_ONE_MINUTE,
} from '@/cache/constants/cache.constants';
import { CacheMSetItem } from '@/cache/interfaces/cache-mset-item.interface';

@Injectable()
export class MetadataService implements OnModuleInit {
    private readonly logger: AppLoggerService;
    private readonly WARMED_FLAG_KEY: string;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly chainService: ChainService,
        @Inject(TOKEN_METADATA_PROVIDER)
        private readonly tokenMetadataProvider: TokenMetadataProvider,
    ) {
        this.logger = new AppLoggerService(MetadataService.name);
        this.WARMED_FLAG_KEY = this.cacheService.getCacheKey(
            'token-metadata',
            'warmed',
        );
    }

    async onModuleInit(): Promise<void> {
        this.logger.log('Checking if token metadata cache is warm...');
        const isCacheWarm: boolean | undefined = await this.cacheService.get(
            this.WARMED_FLAG_KEY,
        );

        if (isCacheWarm) {
            this.logger.log('Cache is already warm. No action needed.');
        } else {
            this.logger.log('Cache is cold. Warming it up now...');
            await this.warmTokenMetadataLookupCache();
        }
    }

    private async warmTokenMetadataLookupCache(): Promise<void> {
        this.logger.log('Warming Master Metadata Cache from database...');
        try {
            const allTokens: TokenWithDetails[] =
                await this.databaseService.token.findMany({
                    include: {
                        tokenMetadata: true,
                        chain: true,
                    },
                });

            await this.updateTokenWithMetadataLookupCache(allTokens);

            // IMPORTANT: Now, set the flag key to indicate the cache is warm.
            // Set it to expire after 24 hours (86,400 seconds). The next day,
            // the cache will be re-warmed by the first server instance that starts.
            await this.cacheService.set(
                this.WARMED_FLAG_KEY,
                true,
                CACHE_TTL_ONE_DAY,
            );

            this.logger.log(
                'Successfully warmed the token metadata lookup cache.',
            );
        } catch (error) {
            const cacheError = error as Error;
            this.logger.error(
                `Failed to warm token metadata lookup cache ${cacheError.message}`,
            );
        }
    }

    async getTokensWithMetadataByWalletAddress(
        walletAddress: string,
        chainNames: string[],
    ): Promise<TokenWithMetadata[]> {
        this.logger.debug(
            `Fetching tokens with metadata for wallet address ${walletAddress} on chains ${chainNames.join(', ')}.`,
        );

        const walletTokensWithMetadataCacheKey = this.cacheService.getCacheKey(
            'wallet-tokens-with-metadata',
            {
                walletAddress,
                chainNames: chainNames.sort().join(','),
            },
        );

        const cachedWalletTokensWithMetadata:
            | { value: TokenWithMetadata[]; ageInSeconds: number }
            | undefined = await this.cacheService.getWithMetadata(
            walletTokensWithMetadataCacheKey,
        ); // getWithMetadata returns an object with value and ageInSeconds, different from metadata of token
        if (cachedWalletTokensWithMetadata) {
            if (
                cachedWalletTokensWithMetadata.ageInSeconds <
                CACHE_TTL_ONE_MINUTE
            ) {
                this.logger.debug(
                    `Fresh cache hit for token metadata for wallet: ${walletAddress}.`,
                );
                return cachedWalletTokensWithMetadata.value;
            }
            this.logger.debug(
                `Stale cache hit for token metadata for wallet: ${walletAddress}. Fetching fresh data.`,
            );
        }

        const providedTokensMetadata =
            await this.tokenMetadataProvider.getByWalletAddress(
                walletAddress,
                chainNames,
            );
        if (!providedTokensMetadata) {
            this.logger.warn(
                `Token metadata provider failed to provide metadata for tokens on wallet address ${walletAddress}.`,
            );
            if (cachedWalletTokensWithMetadata) {
                this.logger.debug(
                    `Returning cached outdated tokens with metadata for wallet address ${walletAddress}.`,
                );
                return cachedWalletTokensWithMetadata.value;
            }
            return []; // No token metadata provided, no cached data so return an empty array
        }

        this.logger.log(
            `Token metadata provider returned ${providedTokensMetadata.length} tokens for wallet address ${walletAddress}.`,
        );

        const { rawTokenMetadataList, tokenIdentifierList } =
            this.splitToRawTokenMetadataOrIdentifiers(providedTokensMetadata);

        const cachedTokensWithMetadata =
            await this.getTokenWithMetadataListFromLookupCache(
                rawTokenMetadataList, // Assuming rawTokenMetadataList matches the TokenIdentifier interface
            );

        const rawTokenMetadataOrTokenWithMetadataList: (
            | RawTokenMetadata
            | TokenWithMetadata
        )[] = rawTokenMetadataList.map((originalItem, index) => {
            // If the cached result exists at this index, use it. Otherwise, fallback to the original item.
            return cachedTokensWithMetadata[index] ?? originalItem;
        });

        // 1. Make a single cache call to fetch token metadata based on the identifiers.
        const cachedTokenMetadataLookups =
            await this.getTokenWithMetadataListFromLookupCache(
                tokenIdentifierList,
            );

        // 2. Filter the lookup results to get only the items that were found (cache hits).
        const cachedTokenWithMetadataListFromTokenIdentifiers: TokenWithMetadata[] =
            cachedTokenMetadataLookups.filter(
                (item): item is TokenWithMetadata => item !== undefined,
            );

        const [rawTokenMetadataListToSave, cachedTokenWithMetadataList] =
            this.partitionByTokenWithMetadata(
                rawTokenMetadataOrTokenWithMetadataList,
                cachedTokenWithMetadataListFromTokenIdentifiers,
            );

        const newlyCreatedTokenWithMetadataList: TokenWithMetadata[] =
            await this.saveNewTokensWithMetadataToDbAndCache(
                rawTokenMetadataListToSave,
            );

        const tokenWithMetadataListToReturn: TokenWithMetadata[] = [
            ...cachedTokenWithMetadataList,
            ...newlyCreatedTokenWithMetadataList,
        ];

        await this.cacheService.set(
            walletTokensWithMetadataCacheKey,
            tokenWithMetadataListToReturn,
            CACHE_TTL_FOUR_WEEKS,
        );

        this.logger.log(
            `Returning ${tokenWithMetadataListToReturn.length} token metadata for wallet address ${walletAddress}.`,
        );
        return tokenWithMetadataListToReturn;
    }

    private partitionByTokenWithMetadata(
        rawRawTokenMetadataOrTokenWithMetadataList: (
            | RawTokenMetadata
            | TokenWithMetadata
        )[],
        tokenWithMetadataList: TokenWithMetadata[],
    ): [RawTokenMetadata[], TokenWithMetadata[]] {
        const rawTokenMetadataList: RawTokenMetadata[] = [];

        for (const item of rawRawTokenMetadataOrTokenWithMetadataList) {
            if ('id' in item) {
                // Check if item is TokenMetadata
                tokenWithMetadataList.push(item);
            } else {
                rawTokenMetadataList.push(item);
            }
        }

        return [rawTokenMetadataList, tokenWithMetadataList];
    }

    private splitToRawTokenMetadataOrIdentifiers(
        externalTokenMetadataList: ExternalTokenMetadataDto[],
    ) {
        const rawTokenMetadataList: RawTokenMetadata[] = [];
        const tokenIdentifierList: TokenIdentifier[] = [];

        for (const externalTokenMetadata of externalTokenMetadataList) {
            if (
                !externalTokenMetadata.symbol ||
                !externalTokenMetadata.name ||
                //|| !externalTokenMetadata.logoUrl // logoUrl is optional, so we don't check it
                !externalTokenMetadata.decimals
            ) {
                tokenIdentifierList.push({
                    chainName: externalTokenMetadata.chainName,
                    address: externalTokenMetadata.address,
                });
            } else {
                rawTokenMetadataList.push({
                    chainName: externalTokenMetadata.chainName,
                    address: externalTokenMetadata.address,
                    symbol: externalTokenMetadata.symbol,
                    name: externalTokenMetadata.name,
                    decimals: externalTokenMetadata.decimals,
                    logo: externalTokenMetadata.logoUrl,
                });
            }
        }
        return { rawTokenMetadataList, tokenIdentifierList };
    }

    private async saveNewTokensWithMetadataToDbAndCache(
        rawTokenMetadataList: RawTokenMetadata[],
    ): Promise<TokenWithMetadata[]> {
        if (rawTokenMetadataList.length === 0) return [];

        this.logger.log(
            `Saving ${rawTokenMetadataList.length} new raw tokens to DB...`,
        );

        const metadataToCreate: Prisma.TokenMetadataCreateManyInput[] = [];
        const tokensToCreate: Prisma.TokenCreateManyInput[] = [];

        for (const rawTokenMetadata of rawTokenMetadataList) {
            const id = uuidv4(); // Generate a unique ID for the token metadata
            const chain: Chain = this.chainService.getChainByName(
                rawTokenMetadata.chainName,
            );

            metadataToCreate.push({
                id: id,
                symbol: rawTokenMetadata.symbol,
                name: rawTokenMetadata.name,
                decimals: rawTokenMetadata.decimals,
                logo: rawTokenMetadata.logo || null,
                description: rawTokenMetadata.description || null,
            });

            tokensToCreate.push({
                address: rawTokenMetadata.address,
                chainId: chain.id,
                tokenMetadataId: id, // Use the generated ID for the token metadata
            });
        }

        await this.databaseService.$transaction([
            this.databaseService.tokenMetadata.createMany({
                data: metadataToCreate,
                skipDuplicates: true, // Skip duplicates to avoid errors
            }),
            this.databaseService.token.createMany({
                data: tokensToCreate,
                skipDuplicates: true,
            }),
        ]);

        const filters = tokensToCreate.map((t) => ({
            chainId: t.chainId,
            address: t.address,
        }));

        const newlyCreatedTokensWithDetails: TokenWithDetails[] =
            await this.databaseService.token.findMany({
                where: {
                    OR: filters,
                },
                include: { chain: true, tokenMetadata: true },
            });

        this.logger.log(
            `Successfully saved ${newlyCreatedTokensWithDetails.length} new tokens with metadata to the database.`,
        );

        await this.updateTokenWithMetadataLookupCache(
            newlyCreatedTokensWithDetails,
        );

        return newlyCreatedTokensWithDetails.map((t) => toTokenWithMetadata(t));
    }

    private async getTokenWithMetadataListFromLookupCache(
        identifiers: TokenIdentifier[],
    ): Promise<(TokenWithMetadata | undefined)[]> {
        if (identifiers.length === 0) {
            return [];
        }
        // 1. Prepare all the cache keys in memory.
        const cacheKeys = identifiers.map((ti) =>
            this.cacheService.getCacheKey('token-with-metadata-lookup', {
                chainName: ti.chainName,
                address: ti.address,
            }),
        );

        return await this.cacheService.mget<TokenWithMetadata>(cacheKeys);
    }

    private async updateTokenWithMetadataLookupCache(
        tokensToCache: TokenWithDetails[],
    ): Promise<void> {
        if (tokensToCache.length === 0) {
            return;
        }
        this.logger.log(
            `Updating Token Lookup Cache with ${tokensToCache.length} tokens with metadata...`,
        );

        const itemsToCache: CacheMSetItem<TokenWithMetadata>[] =
            tokensToCache.map((tokenWithDetails) => {
                const key = this.cacheService.getCacheKey(
                    'token-with-metadata-lookup',
                    {
                        chainName: tokenWithDetails.chain.name,
                        address: tokenWithDetails.address,
                    },
                );
                const value = toTokenWithMetadata(tokenWithDetails);

                // Note: Add a TTL here if you want these keys to expire
                return { key, value /*, ttlInSeconds: ... */ };
            });

        await this.cacheService.mset(itemsToCache);
    }
}
