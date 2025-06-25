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
import { TokenWithMetadataAndExternalBalance } from '@/balance/types/balance.types';
import { CACHE_TTL_ONE_MINUTE } from '@/cache/constants/cache.constants';
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

interface AggregationState {
    // The running total with summed financial data. The `asset` property is a temporary placeholder.
    aggregatedBalance: AssetBalanceDto;
    // A list of the original asset DTOs that have been merged into this group.
    sourceAssets: (TokenDto | UnifiedTokenDto)[];
    // The canonical details for this group from the DB, if it's a unified group.
    unifiedTokenDetails: UnifiedTokenWithDetails | undefined;
}

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

    async getBalances(
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
                walletAddress,
                chainNames: chainNames.sort().join(','),
            },
        );

        const cachedWalletTokenBalances:
            | { value: WalletBalancesDto; ageInSeconds: number }
            | undefined = await this.cacheService.getWithMetadata(
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

        const walletTokensWithMetadata =
            this.metadataService.getTokensWithMetadataByWalletAddress(
                walletAddress,
                chainNames,
            );

        this.logger.log(
            `Calling balance provider for wallet: ${walletAddress} on chains: ${chainNames.slice(0, 4).join(', ')}...`,
        );
        const providedTokenBalances =
            await this.balanceProvider.getTokenBalances(
                walletAddress,
                this.chainService.getAllChains().map((chain) => chain.name),
            );

        if (!providedTokenBalances) {
            this.logger.warn(
                `Balance provider failed to provide balances for wallet: ${walletAddress}`,
            );
            if (cachedWalletTokenBalances) {
                this.logger.debug(
                    `Returning cached outdated token balances for wallet: ${walletAddress}`,
                );
                return cachedWalletTokenBalances.value;
            }
            return { balances: [] }; // No token balances provided and no cache available so return empty balances
        }

        this.logger.log(
            `Balance provider provided ${providedTokenBalances.length} token balances for wallet: ${walletAddress}`,
        );

        const tokenWithMetadataAndExternalBalanceList =
            this.joinByChainNameAndAddress(
                await walletTokensWithMetadata,
                providedTokenBalances,
            );

        const priceResults = await this.getPrices(
            tokenWithMetadataAndExternalBalanceList,
        );

        const assetBalancesWithoutUnifiedToken = this.transformToAssetBalances(
            tokenWithMetadataAndExternalBalanceList,
            priceResults,
        );

        const aggregatedAssetBalances = this.aggregateAssetBalances(assetBalancesWithoutUnifiedToken)

        ///this.saveToFile(walletTokensWithMetadata, walletAddress, 'output_dune');
        this.saveToFile(providedTokenBalances, walletAddress, 'output_okx');
        this.saveToFile(
            aggregatedAssetBalances,
            walletAddress,
            'output_balance',
        );
        this.saveToFile(priceResults, walletAddress, 'output_prices');

        return {balances: assetBalancesWithoutUnifiedToken};
    }


    /**
     * Helper to find the unique identifier for an asset, which is the ID of its
     * unified token if it exists, or its own metadata ID if it's standalone.
     */
    private getAssetGroupingInfo(asset: TokenDto | UnifiedTokenDto): { groupingKey: string, unifiedTokenDetails: UnifiedTokenWithDetails | undefined } {
        let identifier: TokenIdentifier;
        if (asset.type === 'unified') {
            identifier =  { chainName: asset.tokens[0].chainName, address: asset.tokens[0].address } as TokenIdentifier;
        } else {
            identifier = { chainName: asset.chainName, address: asset.address } as TokenIdentifier;
        }

        this.logger.debug(
            `Determining grouping key for asset: ${asset.tokenMetadata.name} with identifier: ${JSON.stringify(identifier)}`,
        )

        const unifiedTokenDetails = this.tokenService.getUnifiedTokenByTokenIdentifier(identifier);

        this.logger.debug(
            `Found unified token details: ${unifiedTokenDetails ? unifiedTokenDetails.id : 'none'}`,
        );


        let groupingKey: string;
        if (unifiedTokenDetails) {
            groupingKey = unifiedTokenDetails.id;
        } else {
            // If no unified token exists, it means this is a single token.
            const singleToken = asset as TokenDto;
            groupingKey = getKeyFromChainNameAndAddress(singleToken.chainName, singleToken.address);
        }

        return { groupingKey, unifiedTokenDetails };
    }

    /**
     * Helper to collect a unique list of TokenDto objects from a list of source assets.
     */
    private collectUniqueTokens(sourceAssets: (TokenDto | UnifiedTokenDto)[]): TokenDto[] {
        const tokenMap = new Map<string, TokenDto>();

        for (const asset of sourceAssets) {
            if (asset.type === 'single') {
                tokenMap.set(getKeyFromChainNameAndAddress(asset.chainName, asset.address), asset);
            } else { // 'unified'
                asset.tokens.forEach(token => {
                    tokenMap.set(getKeyFromChainNameAndAddress(token.chainName, token.address), token);
                });
            }
        }
        return Array.from(tokenMap.values());
    }

    /**
     * Aggregates a list of asset balances, grouping identical assets (e.g., USDC on Ethereum
     * and USDC on Polygon) into a single entry with summed balances.
     * @param assetBalances The raw list of asset balances to aggregate.
     * @returns A new list of aggregated AssetBalanceDto objects.
     */
    private aggregateAssetBalances(
        assetBalances: AssetBalanceDto[],
    ): AssetBalanceDto[] {

        // The Map will store the aggregation state. The key is the grouping ID.
        const aggregationMap = new Map<string, AggregationState>();

        // --- PHASE 1: Group and Sum Financial Data ---
        for (const currentBalance of assetBalances) {
            const { groupingKey, unifiedTokenDetails } = this.getAssetGroupingInfo(currentBalance.asset);
            const existingState = aggregationMap.get(groupingKey);

            if (!existingState) {
                // First time seeing this asset group. Create a new state.
                aggregationMap.set(groupingKey, {
                    aggregatedBalance: currentBalance, // Store the first DTO as the base
                    sourceAssets: [currentBalance.asset],
                    unifiedTokenDetails: unifiedTokenDetails,
                });
            } else {
                // Merge the current balance into the existing state.
                const { aggregatedBalance, sourceAssets } = existingState;

                // Sum up the financial values.
                aggregatedBalance.balance = aggregatedBalance.balance.plus(currentBalance.balance);
                aggregatedBalance.balanceQuote = aggregatedBalance.balanceQuote.plus(currentBalance.balanceQuote);

                const existingChange = aggregatedBalance.balanceQuoteChange ?? new Decimal(0);
                const currentChange = currentBalance.balanceQuoteChange ?? new Decimal(0);
                aggregatedBalance.balanceQuoteChange = existingChange.plus(currentChange);

                // Add the original asset to our list for later processing.
                sourceAssets.push(currentBalance.asset); // not sure if it updates the original AggregationState
            }
        }

        // --- PHASE 2: Finalize DTOs based on the "minimum of two" rule ---
        const finalBalances: AssetBalanceDto[] = [];
        for (const state of aggregationMap.values()) {
            const { aggregatedBalance, sourceAssets, unifiedTokenDetails } = state;

            // Check if we have enough assets to justify creating a UnifiedTokenDto.
            if (sourceAssets.length >= 2) {
                this.logger.debug(
                    `Found ${sourceAssets.length} assets for grouping key: ${aggregatedBalance.asset.tokenMetadata.name})`,
                );
            }
            if (sourceAssets.length >= 2 && unifiedTokenDetails) {
                // We have 2 or more assets from the same group, create a unified view.

                this.logger.debug(
                    `Aggregating ${sourceAssets.length} assets into a unified token group: ${unifiedTokenDetails.tokenMetadata.name} (${unifiedTokenDetails.id})`,
                )

                // Collect all the unique TokenDtos from the source assets.
                const allTokensInGroup = this.collectUniqueTokens(sourceAssets);

                const unifiedMetadataDto = TokenMetadataDto.fromModel(unifiedTokenDetails.tokenMetadata);

                // The price of the unified token is the aggregated quote divided by aggregated balance.
                // We'll take the price from the first token as a representative price.
                const representativePriceDto = allTokensInGroup[0].tokenPrice;

                // Update the asset property of our aggregated balance.
                aggregatedBalance.asset = new UnifiedTokenDto(
                    allTokensInGroup,
                    unifiedMetadataDto,
                    representativePriceDto,
                );

                // Recalculate percentage change for the final aggregated DTO
                aggregatedBalance.balanceQuoteChangePercent =
                    aggregatedBalance.balanceQuoteChange
                        ? calculateChangePercent(aggregatedBalance.balanceQuote, aggregatedBalance.balanceQuoteChange)
                        : null;

                finalBalances.push(aggregatedBalance);

            } else {
                this.logger.debug(
                    `Keeping single asset balance without unification: ${aggregatedBalance.asset.tokenMetadata.name})`,
                );
                // Only one asset from this group was found. We do NOT unify it.
                // We simply return the original, unmodified AssetBalanceDto.
                finalBalances.push(aggregatedBalance);
            }
        }

        return finalBalances;
    }


    private transformToAssetBalances(
        tokenWithMetadataAndExternalBalanceList: TokenWithMetadataAndExternalBalance[],
        priceResults: PriceInfo[],
    ): AssetBalanceDto[]  {
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
            const balanceQuoteChange: Decimal | null =
                priceInfo.priceUsdChange
                    ? balance.times(priceInfo.priceUsdChange)
                    : null;

            // --- Step 3: Construct All DTOs ---

            // Create TokenMetadataDto using the provided static factory method.
            const tokenMetadataDto = TokenMetadataDto.fromModel(tokenWithMetadata.tokenMetadata);

            // Create TokenPriceDto. We instantiate it directly since the constructor
            // in your example requires a different input type.
            const tokenPriceDto = new TokenPriceDto(
                priceInfo.currentPriceUsd,        // priceQuote
                priceInfo.timestamp,              // timestamp
                priceInfo.priceUsdChange ?? null, // change, handle undefined case
            );

            // Create the main asset DTO. We also instantiate this directly because
            // its constructor requires full Prisma models which we don't have here.
            const tokenDto = new TokenDto(
                tokenWithMetadata.chainName,
                tokenWithMetadata.address,
                tokenMetadataDto,
                tokenPriceDto,
            );

            // --- Step 4: Construct and Return Final DTO ---
            // The AssetBalanceDto constructor will automatically calculate the percentage change.
            return new AssetBalanceDto(
                tokenDto,
                balance,
                balanceQuote,
                balanceQuoteChange,
            );
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
            const key = getKeyFromChainNameAndAddress(token.chainName, token.address);
            walletTokensWithMetadataMap[key] = token;
        });

        providedTokenBalances.forEach((balance) => {
            const key = getKeyFromChainNameAndAddress(balance.chainName, balance.address);
            const tokenWithMetadata = walletTokensWithMetadataMap[key];
            if (tokenWithMetadata) {
                tokenWithMetadataAndExternalBalanceList.push({
                    tokenWithMetadata: tokenWithMetadata,
                    externalBalance: balance,
                });
            } else {
                this.logger.warn(
                    `No metadata found for token: ${key}`,
                );
            }
        });

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
    ): void {
        const timestamp = new Date()
            .toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '');
        const outputDir = path.join(fileName, walletAddress);
        const outputFile = path.join(outputDir, `${timestamp}.json`);

        console.log(`\nSaving filtered data to: ${outputFile}`);
        mkdirSync(outputDir, { recursive: true });

        const fileContent = JSON.stringify(walletTokensWithMetadata, null, 2);
        writeFileSync(outputFile, fileContent, 'utf-8');

        console.log('\n✅ Success! Data saved.');
    }
}
