import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { CacheService } from '@/cache/cache.service';
import { MetadataService } from '@/metadata/metadata.service';
import { ChainService } from '@/chain/chain.service';
import * as path from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import {
    BALANCE_PROVIDER,
    BalanceProvider,
} from '@/balance/interfaces/balance-provider.interface';
import { TokenIdentifier, TokenWithMetadata } from '@/token/types/token.types';
import { WalletBalancesDto } from '@/balance/dto/wallet-balances.dto';
import { ExternalTokenBalanceDto } from '@/balance/dto/external-token-balance.dto';
import {
    SingleTokenBalance,
    TokenWithMetadataAndExternalBalance,
} from '@/balance/types/balance.types';
import {
    CACHE_TTL_FOUR_WEEKS,
    CACHE_TTL_ONE_MINUTE,
} from '@/cache/constants/cache.constants';
import { PriceService } from '@/price/price.service';
import { PriceInfo } from '@/price/types/price.types';
import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { TokenService } from '@/token/token.service';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';
import { UnifiedTokenWithDetails } from '@/token/types/unified-token.types';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';
import { getKeyFromChainNameAndAddress } from '@/token/utils/token.utils';
import { BalanceDto, TotalBalanceDto } from '@/balance/dto/balance.dto';
import {
    AggregationState,
    SubTokenAggregation,
} from '@/balance/types/aggregation.types';
import { PortfolioBalancesDto } from '@/balance/dto/portfolio-balances.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class BalanceService {
    private readonly logger: AppLoggerService;

    constructor(
        private readonly cacheService: CacheService,
        private readonly metadataService: MetadataService,
        private readonly chainService: ChainService,
        private readonly priceService: PriceService,
        private readonly tokenService: TokenService,
        @Inject(BALANCE_PROVIDER)
        private readonly balanceProvider: BalanceProvider,
    ) {
        this.logger = new AppLoggerService(BalanceService.name);
    }

    async getWalletBalances(
        walletAddress: string,
        chainNames: string[] | undefined = undefined,
    ): Promise<WalletBalancesDto> {
        if (!chainNames) {
            chainNames = this.chainService
                .getAllChains()
                .map((chain) => chain.name);
        }
        this.logger.debug(
            `Fetching token balances for wallet: ${walletAddress} on chains: ${chainNames.join(', ')}`,
        );

        const walletTokenBalancesCacheKey = this.cacheService.getCacheKey(
            'wallet-token-balances',
            {
                walletAddress: walletAddress,
                chainNames: chainNames.sort().join(','),
            },
        );

        const cachedWalletTokenBalances:
            | { value: WalletBalancesDto; ageInSeconds: number }
            | undefined =
            await this.cacheService.getWithMetadata<WalletBalancesDto>(
                walletTokenBalancesCacheKey,
            );
        if (cachedWalletTokenBalances) {
            if (cachedWalletTokenBalances.ageInSeconds < CACHE_TTL_ONE_MINUTE) {
                this.logger.debug(
                    `Fresh cache hit for token balances for wallet: ${walletAddress}`,
                );
                return cachedWalletTokenBalances.value;
            }
            this.logger.debug(
                `Stale cache hit for token balances for wallet: ${walletAddress}, Fetching fresh data.`,
            );
        }

        const freshWalletBalances = await this.fetchAndComputeWalletBalances(
            walletAddress,
            chainNames,
            cachedWalletTokenBalances,
        );

        await this.cacheService.set(
            walletTokenBalancesCacheKey,
            freshWalletBalances,
            CACHE_TTL_FOUR_WEEKS,
        );

        return freshWalletBalances;
    }

    private async fetchAndComputeWalletBalances(
        walletAddress: string,
        chainNames: string[],
        staleCache:
            | { value: WalletBalancesDto; ageInSeconds: number }
            | undefined,
    ): Promise<WalletBalancesDto> {
        // Step 1: Fetch data from all external providers concurrently
        const walletTokensWithMetadataPromise =
            this.metadataService.getTokensWithMetadataByWalletAddress(
                walletAddress,
                chainNames,
            );

        this.logger.log(
            `Calling balance provider for wallet: ${walletAddress} on chains: ${chainNames.slice(0, 4).join(', ')}...`,
        );
        const providedTokenBalancesPromise =
            this.balanceProvider.getTokenBalances(
                walletAddress,
                chainNames, // Use the scoped chainNames for the request
            );

        const [walletTokensWithMetadata, providedTokenBalances] =
            await Promise.all([
                walletTokensWithMetadataPromise,
                providedTokenBalancesPromise,
            ]);

        // Step 2: Handle provider failure
        if (!providedTokenBalances) {
            this.logger.warn(
                `Balance provider failed to provide balances for wallet: ${walletAddress}`,
            );
            // If the provider fails, return the stale cache if we have it.
            if (staleCache) {
                this.logger.debug(
                    `Returning cached outdated token balances for wallet: ${walletAddress}`,
                );
                return staleCache.value;
            }
            // Otherwise, return an empty object.
            return {
                assetBalances: [],
                totalBalance: new TotalBalanceDto(
                    /*balanceQuote = */ new Decimal(0),
                ),
            }; // No token balances provided and no cache available so return empty balances
        }

        this.logger.log(
            `Balance provider provided ${providedTokenBalances.length} token balances for wallet: ${walletAddress}`,
        );

        // Step 3: Join, Transform, and Aggregate the data
        const tokenWithMetadataAndExternalBalanceList =
            this.joinByChainNameAndAddress(
                walletTokensWithMetadata,
                providedTokenBalances,
            );

        const priceResults = await this.getPrices(
            tokenWithMetadataAndExternalBalanceList,
        );

        const singleTokenBalances = this.transformToSingleTokenBalances(
            tokenWithMetadataAndExternalBalanceList,
            priceResults,
        );

        const aggregatedAssetBalances =
            this.aggregateSingleTokenBalances(singleTokenBalances);

        const totalBalance = this.calculateTotalBalance(
            aggregatedAssetBalances,
        );

        // Step 4: Return the final, computed DTO
        return {
            totalBalance: totalBalance,
            assetBalances: aggregatedAssetBalances,
        };
    }

    async getPortfolioBalancesFromCache(
        walletAddresses: string[],
        chainNames: string[] | undefined = undefined,
    ): Promise<PortfolioBalancesDto> {
        if (walletAddresses.length === 0) {
            this.logger.warn(
                `No wallet addresses provided for portfolio balances.`,
            );
            return {
                actual: true,
                totalBalance: {
                    balanceQuote: new Decimal(0),
                    balanceQuoteChange: null,
                    balanceQuoteChangePercent: null,
                },
                assetBalances: [],
            };
        }

        if (!chainNames) {
            chainNames = this.chainService
                .getAllChains()
                .map((chain) => chain.name);
        }
        this.logger.debug(
            `Fetching token balances for wallets: ${walletAddresses.join(
                ', ',
            )} on chains: ${chainNames.join(', ')}`,
        );

        const portfolioBalancesCacheKey = this.cacheService.getCacheKey(
            'portfolio-token-balances',
            {
                walletAddresses: walletAddresses.sort().join(','),
                chainNames: chainNames.sort().join(','),
            },
        );

        const cachedPortfolioBalances:
            | { value: PortfolioBalancesDto; ageInSeconds: number }
            | undefined =
            await this.cacheService.getWithMetadata<PortfolioBalancesDto>(
                portfolioBalancesCacheKey,
            );

        if (cachedPortfolioBalances) {
            if (
                cachedPortfolioBalances.ageInSeconds < CACHE_TTL_ONE_MINUTE &&
                cachedPortfolioBalances.value.actual
            ) {
                this.logger.debug(
                    `Fresh cache hit for token balances for wallets: ${walletAddresses.join(', ')}`,
                );
                return cachedPortfolioBalances.value;
            }
            this.logger.debug(`Stale cache hit for portfolio token balances.`);
        }

        this.logger.debug(
            `Proceeding to aggregate PortfolioBalancesDto from wallet caches.`,
        );

        const portfolioBalancesDto =
            await this.aggregateBalancesFromCachedWallets(
                walletAddresses,
                chainNames,
                cachedPortfolioBalances?.value,
            );

        await this.cacheService.set(
            portfolioBalancesCacheKey,
            portfolioBalancesDto,
            CACHE_TTL_FOUR_WEEKS,
        );

        return portfolioBalancesDto;
    }

    private async aggregateBalancesFromCachedWallets(
        walletAddresses: string[],
        chainNames: string[],
        staleCache?: PortfolioBalancesDto,
    ): Promise<PortfolioBalancesDto> {
        let isActual = true; // Assume true until a stale or missing wallet is found

        const walletTokenBalancesCacheKeys = walletAddresses.map((address) =>
            this.cacheService.getCacheKey('wallet-token-balances', {
                walletAddress: address,
                chainNames: chainNames.sort().join(','),
            }),
        );

        const cachedWalletTokenBalancesList =
            await this.cacheService.mgetWithMetadata<WalletBalancesDto>(
                walletTokenBalancesCacheKeys,
            );

        const walletBalances: WalletBalancesDto[] =
            cachedWalletTokenBalancesList
                .map((cachedWalletTokenBalances, index) => {
                    const address = walletAddresses[index]; // Get original wallet address for logging
                    if (cachedWalletTokenBalances) {
                        let cacheState = 'Stale'; // Default to stale if no specific freshness check here
                        if (
                            cachedWalletTokenBalances.ageInSeconds <
                            CACHE_TTL_ONE_MINUTE
                        ) {
                            cacheState = 'Fresh';
                        } else {
                            isActual = false; // If any wallet is stale, the whole portfolio is stale
                        }
                        this.logger.debug(
                            `${cacheState} cache hit for token balances for wallet: ${address}.`,
                        );
                        // Use plainToInstance to ensure Decimal objects are re-hydrated
                        return plainToInstance(
                            WalletBalancesDto,
                            cachedWalletTokenBalances.value,
                            { enableImplicitConversion: true },
                        );
                    } else {
                        this.logger.debug(
                            `No cached token balances found for wallet: ${address}`,
                        );
                        isActual = false; // If any wallet is not cached, the whole portfolio is stale
                        return undefined; // Filtered out later
                    }
                })
                .filter(
                    (balance): balance is WalletBalancesDto =>
                        balance !== undefined,
                ); // Type guard for filter

        if (walletBalances.length === 0) {
            if (staleCache) return staleCache; // Return cached value if no wallet balances are found
            this.logger.debug(
                `No wallet balances found for portfolio. Returning empty portfolio balances.`,
            );
            return {
                actual: false,
                totalBalance: new TotalBalanceDto(
                    /*balanceQuote = */ new Decimal(0),
                ),
                assetBalances: [],
            };
        }

        const portfolioAssetBalances = walletBalances.flatMap(
            (walletBalance) => walletBalance.assetBalances,
        );

        const portfolioSingleTokenBalances = this.flattenToSingleTokenBalances(
            portfolioAssetBalances,
        );

        const aggregatedPortfolioAssetBalances =
            this.aggregateSingleTokenBalances(portfolioSingleTokenBalances);

        const portfolioTotalBalance = this.calculateTotalBalance(
            aggregatedPortfolioAssetBalances,
        );

        return {
            actual: isActual,
            totalBalance: portfolioTotalBalance,
            assetBalances: aggregatedPortfolioAssetBalances,
        };
    }

    /**
     * Helper to find the unique identifier for an asset, which is the ID of its
     * unified token if it exists, or its own metadata ID if it's standalone.
     */
    private getAssetGroupingInfo(asset: TokenDto | UnifiedTokenDto): {
        groupingKey: string;
        unifiedTokenDetails: UnifiedTokenWithDetails | undefined;
    } {
        let identifier: TokenIdentifier;
        if (asset.type === 'unified') {
            identifier = {
                chainName: asset.tokens[0].chainName,
                address: asset.tokens[0].address,
            };
        } else {
            identifier = { chainName: asset.chainName, address: asset.address };
        }

        const unifiedTokenDetails =
            this.tokenService.getUnifiedTokenByTokenIdentifier(identifier);

        let groupingKey: string;
        if (unifiedTokenDetails) {
            groupingKey = unifiedTokenDetails.id;
        } else {
            // If no unified token exists, it means this is a single token.
            const singleToken = asset as TokenDto;
            groupingKey = getKeyFromChainNameAndAddress(
                singleToken.chainName,
                singleToken.address,
            );
        }

        return { groupingKey, unifiedTokenDetails };
    }

    private sumIndividualBalances(balances: BalanceDto[]): BalanceDto {
        let totalBalanceNative = new Decimal(0);
        let totalBalanceQuote = new Decimal(0);
        let totalBalanceQuoteChange = new Decimal(0);

        for (const balanceDto of balances) {
            totalBalanceNative = totalBalanceNative.plus(
                balanceDto.balanceNative,
            );
            totalBalanceQuote = totalBalanceQuote.plus(balanceDto.balanceQuote);
            totalBalanceQuoteChange = totalBalanceQuoteChange.plus(
                balanceDto.balanceQuoteChange ?? 0,
            );
        }

        return new BalanceDto(
            totalBalanceNative,
            totalBalanceQuote,
            totalBalanceQuoteChange,
        );
    }

    private calculateTotalBalance(
        assetBalances: AssetBalanceDto[],
    ): TotalBalanceDto {
        if (assetBalances.length === 0) {
            return new TotalBalanceDto(/*balanceQuote = */ new Decimal(0));
        }
        const balances = assetBalances.map(
            (assetBalance) => assetBalance.balance,
        );

        const total = this.sumIndividualBalances(balances);

        return new TotalBalanceDto(
            total.balanceQuote,
            total.balanceQuoteChange,
            total.balanceQuoteChangePercent,
        );
    }

    private aggregateSingleTokenBalances(
        singleTokenBalances: SingleTokenBalance[],
    ): AssetBalanceDto[] {
        if (singleTokenBalances.length === 0) return []; // No balances to aggregate

        // Step 1: Group the list and aggregate the financial data for each unique token.
        const aggregationMap = this.groupAndAggregate(singleTokenBalances);

        // Step 2: Take the aggregated data and construct the final DTOs, applying the
        // "minimum of two" rule to create UnifiedTokenDto where appropriate.

        const assetBalances = this.finalizeConstruction(aggregationMap);

        // Step 3: Sort the list of all assets by their balanceQuote in descending order.
        assetBalances.sort((a: AssetBalanceDto, b: AssetBalanceDto) =>
            b.balance.balanceQuote.comparedTo(a.balance.balanceQuote),
        );

        return assetBalances;
    }

    private groupAndAggregate(
        singleTokenBalances: SingleTokenBalance[],
    ): Map<string, AggregationState> {
        const aggregationMap = new Map<string, AggregationState>();

        for (const currentBalance of singleTokenBalances) {
            const asset = currentBalance.token;

            const { groupingKey, unifiedTokenDetails } =
                this.getAssetGroupingInfo(asset);
            const subTokenKey = getKeyFromChainNameAndAddress(
                asset.chainName,
                asset.address,
            );

            const existingGroupState = aggregationMap.get(groupingKey);

            if (!existingGroupState) {
                // First time seeing this group.
                const newSubTokenAggregations = new Map<
                    string,
                    SubTokenAggregation
                >();
                newSubTokenAggregations.set(subTokenKey, {
                    aggregatedBalance: currentBalance.balance,
                    representativeAsset: asset,
                });
                aggregationMap.set(groupingKey, {
                    subTokenAggregations: newSubTokenAggregations,
                    unifiedTokenDetails: unifiedTokenDetails,
                });
            } else {
                // Group exists, check for the sub-token.
                const existingSubToken =
                    existingGroupState.subTokenAggregations.get(subTokenKey);
                if (!existingSubToken) {
                    // First time seeing this sub-token within this group.
                    existingGroupState.subTokenAggregations.set(subTokenKey, {
                        aggregatedBalance: currentBalance.balance,
                        representativeAsset: asset,
                    });
                } else {
                    // We have multiple balances for the exact same token. Sum them.
                    const accumulatedBalance =
                        existingSubToken.aggregatedBalance;
                    accumulatedBalance.balanceNative =
                        accumulatedBalance.balanceNative.plus(
                            currentBalance.balance.balanceNative,
                        );
                    accumulatedBalance.balanceQuote =
                        accumulatedBalance.balanceQuote.plus(
                            currentBalance.balance.balanceQuote,
                        );
                    const existingChange =
                        accumulatedBalance.balanceQuoteChange ?? new Decimal(0);
                    const currentChange =
                        currentBalance.balance.balanceQuoteChange ??
                        new Decimal(0);
                    accumulatedBalance.balanceQuoteChange =
                        existingChange.plus(currentChange);
                }
            }
        }
        return aggregationMap;
    }

    /**
     * Transforms the final aggregation map into a list of AssetBalanceDto objects,
     * applying the "minimum of two" rule for creating UnifiedTokenDto.
     * @param aggregationMap The map containing the fully aggregated state.
     * @returns List of asset balances.
     */
    private finalizeConstruction(
        aggregationMap: Map<string, AggregationState>,
    ): AssetBalanceDto[] {
        const assetBalances: AssetBalanceDto[] = [];
        for (const state of aggregationMap.values()) {
            const { subTokenAggregations, unifiedTokenDetails } = state;
            const uniqueSubTokens = Array.from(subTokenAggregations.values());

            if (uniqueSubTokens.length >= 2) {
                // CASE A: Create a UnifiedTokenDto
                if (!unifiedTokenDetails) {
                    this.logger.warn(
                        `Expected unified token details for grouping key, but found none.`,
                    );
                    continue; // Skip this group if no unified token details are found
                }
                // Sort the underlying tokens by their balanceQuote in descending order
                uniqueSubTokens.sort((a, b) =>
                    b.aggregatedBalance.balanceQuote.comparedTo(
                        a.aggregatedBalance.balanceQuote,
                    ),
                );

                const finalTokens = uniqueSubTokens.map(
                    (sub) => sub.representativeAsset,
                );
                const finalIndividualBalances = uniqueSubTokens.map(
                    (sub) => sub.aggregatedBalance,
                );
                const totalAggregatedBalance = this.sumIndividualBalances(
                    finalIndividualBalances,
                );
                const unifiedMetadataDto = TokenMetadataDto.fromModel(
                    unifiedTokenDetails.tokenMetadata,
                );
                const representativePriceDto = finalTokens[0].tokenPrice;

                const unifiedAsset = new UnifiedTokenDto(
                    finalTokens,
                    finalIndividualBalances,
                    unifiedMetadataDto,
                    representativePriceDto,
                );
                assetBalances.push(
                    new AssetBalanceDto(unifiedAsset, totalAggregatedBalance),
                );
            } else {
                // CASE B: Do NOT unify.The group has only one unique token. Operate on the first (and only) element.
                const subToken = uniqueSubTokens[0];
                subToken.aggregatedBalance.balanceQuoteChangePercent = subToken
                    .aggregatedBalance.balanceQuoteChange
                    ? calculateChangePercent(
                          subToken.aggregatedBalance.balanceQuote,
                          subToken.aggregatedBalance.balanceQuoteChange,
                      )
                    : null;
                assetBalances.push(
                    new AssetBalanceDto(
                        subToken.representativeAsset,
                        subToken.aggregatedBalance,
                    ),
                );
            }
        }
        return assetBalances;
    }

    private flattenToSingleTokenBalances(
        assetBalances: AssetBalanceDto[],
    ): SingleTokenBalance[] {
        const flattenedList: SingleTokenBalance[] = [];

        for (const assetBalance of assetBalances) {
            if (assetBalance.asset.type === 'single') {
                // This is already a simple TokenDto balance, pass it through.
                flattenedList.push({
                    token: assetBalance.asset,
                    balance: assetBalance.balance,
                });
            } else {
                // This is a UnifiedTokenDto. Unroll it into its constituent parts.
                // For each underlying token, create a new AssetBalanceDto.
                for (let i = 0; i < assetBalance.asset.tokens.length; i++) {
                    flattenedList.push({
                        token: assetBalance.asset.tokens[i],
                        balance: assetBalance.asset.balances[i],
                    });
                }
            }
        }
        return flattenedList;
    }

    private transformToSingleTokenBalances(
        tokenWithMetadataAndExternalBalanceList: TokenWithMetadataAndExternalBalance[],
        priceResults: PriceInfo[],
    ): SingleTokenBalance[] {
        return tokenWithMetadataAndExternalBalanceList.map((item, index) => {
            // --- Step 1: Get Corresponding Data ---
            // Get the price data for this token using the index.
            const priceInfo = priceResults[index];
            const { tokenWithMetadata, externalBalance } = item;

            // --- Step 2: Perform Key Calculations ---

            // The user's balance in the token's native amount (e.g., 1.5 ETH).
            const balance = externalBalance.balance;

            // The current USD value of that balance (balance * current price).
            // We use the pre-calculated `balanceUsd` from the input for accuracy.
            const balanceQuote = externalBalance.balanceUsd;

            // The absolute change in the USD value of the balance.
            // This is calculated as: (user's token balance) * (the token's price change).
            // If there's no price change data, this will be null.
            const balanceQuoteChange: Decimal | null = priceInfo.priceUsdChange
                ? balance.times(priceInfo.priceUsdChange)
                : null;

            // --- Step 3: Construct All DTOs ---

            // Create TokenMetadataDto using the provided static factory method.
            const tokenMetadataDto = TokenMetadataDto.fromModel(
                tokenWithMetadata.tokenMetadata,
            );

            // Create TokenPriceDto. We instantiate it directly since the constructor
            // in your example requires a different input type.
            const tokenPriceDto = new TokenPriceDto(
                priceInfo.currentPriceUsd, // priceQuote
                priceInfo.timestamp, // timestamp
                priceInfo.priceUsdChange ?? null, // change, handle an undefined case
            );

            // Create the main asset DTO. We also instantiate this directly because
            // its constructor requires full Prisma models which we don't have here.
            const tokenDto = new TokenDto(
                tokenWithMetadata.chainName,
                tokenWithMetadata.address,
                tokenMetadataDto,
                tokenPriceDto,
            );

            const balanceDto = new BalanceDto(
                balance, // balanceNative
                balanceQuote, // balanceQuote
                balanceQuoteChange, // balanceQuoteChange
            );

            // --- Step 4: Construct and Return Final DTO ---
            // The AssetBalanceDto constructor will automatically calculate the percentage change.
            return {
                token: tokenDto,
                balance: balanceDto,
            };
        });
    }

    private joinByChainNameAndAddress(
        walletTokensWithMetadata: TokenWithMetadata[],
        providedTokenBalances: ExternalTokenBalanceDto[],
    ): TokenWithMetadataAndExternalBalance[] {
        const tokenWithMetadataAndExternalBalanceList: TokenWithMetadataAndExternalBalance[] =
            [];
        const walletTokensWithMetadataMap: Record<string, TokenWithMetadata> =
            {};
        walletTokensWithMetadata.forEach((token) => {
            const key = getKeyFromChainNameAndAddress(
                token.chainName,
                token.address,
            );
            walletTokensWithMetadataMap[key] = token;
        });

        let missingTokensCount = 0;

        providedTokenBalances.forEach((balance) => {
            const key = getKeyFromChainNameAndAddress(
                balance.chainName,
                balance.address,
            );
            const tokenWithMetadata = walletTokensWithMetadataMap[key];
            if (tokenWithMetadata) {
                tokenWithMetadataAndExternalBalanceList.push({
                    tokenWithMetadata: tokenWithMetadata,
                    externalBalance: balance,
                });
            } else {
                missingTokensCount++;
            }
        });

        if (missingTokensCount > 0) {
            this.logger.warn(
                `Found ${missingTokensCount} provided token balances without matching metadata.`,
            );
        }

        return tokenWithMetadataAndExternalBalanceList;
    }

    private async getPrices(
        tokenWithMetadataAndExternalBalanceList: TokenWithMetadataAndExternalBalance[],
    ): Promise<PriceInfo[]> {
        const tokenPriceUpdates = tokenWithMetadataAndExternalBalanceList.map(
            (token) => ({
                tokenId: token.tokenWithMetadata.id,
                priceUsd: token.externalBalance.priceUsd,
            }),
        );
        await this.priceService.updateTokenPrices(tokenPriceUpdates);
        return this.priceService.getPricesInfo(
            tokenWithMetadataAndExternalBalanceList.map(
                (token) => token.tokenWithMetadata.id,
            ),
        );
    }

    saveToFile(
        walletTokensWithMetadata: any[],
        walletAddress: string,
        fileName: string,
        content: string | undefined = undefined,
    ): void {
        const timestamp = new Date()
            .toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '');
        const outputDir = path.join(fileName, walletAddress);
        const outputFile = path.join(outputDir, `${timestamp}.json`);

        console.log(`\nSaving filtered data to: ${outputFile}`);
        mkdirSync(outputDir, { recursive: true });

        const fileContent =
            content ?? JSON.stringify(walletTokensWithMetadata, null, 2);
        writeFileSync(outputFile, fileContent, 'utf-8');

        console.log('\n✅ Success! Data saved.');
    }
}
