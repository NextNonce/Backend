import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { CacheService } from '@/cache/cache.service';
import { DatabaseService } from '@/database/database.service';
import {
    CachedPriceData,
    PriceInfo,
    TokenPriceUpdate,
} from '@/price/types/price.types';
import { Prisma } from '@prisma/client';
import { CacheMSetItem } from '@/cache/interfaces/cache-mset-item.interface';
import { Decimal } from '@prisma/client/runtime/library';
import { CACHE_TTL_ONE_WEEK } from '@/cache/constants/cache.constants';

// Helper to get a consistent date string (important to avoid timezone issues)
const getUTCDateString = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

@Injectable()
export class PriceService {
    private readonly logger: AppLoggerService;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {
        this.logger = new AppLoggerService(PriceService.name);
    }

    async updateTokenPrices(priceUpdates: TokenPriceUpdate[]): Promise<void> {
        if (priceUpdates.length === 0) return;

        this.logger.log(
            `Starting price update for ${priceUpdates.length} tokens.`,
        );

        const batchTimestamp = new Date();
        const todayDateString = getUTCDateString(batchTimestamp);

        // Step 1: Prepare a list of keys to check against the cache.
        // This creates a key for today's daily price snapshot for each token.
        const dailySnapshotKeys = priceUpdates.map((price) =>
            this.cacheService.getCacheKey('prices-daily', {
                tokenId: price.tokenId,
                date: todayDateString,
            }),
        );

        // Step 2: Check the cache IN BULK to see which tokens already have a daily snapshot.
        const existingSnapshots = await this.cacheService.mget<{
            price: string;
        }>(dailySnapshotKeys);

        // Step 3: Filter to find which tokens need a new snapshot created in the DB.
        // It compares the original list with the cache results to find the "misses".
        const tokenPricesToCreateInDb: TokenPriceUpdate[] = [];
        priceUpdates.forEach((priceUpdate, index) => {
            if (!existingSnapshots[index]) {
                tokenPricesToCreateInDb.push(priceUpdate);
            }
        });

        this.logger.debug(
            `${tokenPricesToCreateInDb.length} tokens require a new daily snapshot.`,
        );

        // Step 4: Perform a SINGLE database write for all new snapshots.
        if (tokenPricesToCreateInDb.length > 0) {
            const dbData: Prisma.TokenPriceCreateManyInput[] =
                tokenPricesToCreateInDb.map((p) => ({
                    tokenId: p.tokenId,
                    priceUsd: p.priceUsd,
                    timestamp: batchTimestamp,
                }));

            await this.databaseService.tokenPrice.createMany({
                data: dbData,
                skipDuplicates: true, // Uses a @@unique constraint @@unique([tokenId, timestamp])
            });
            this.logger.log(
                `Wrote ${dbData.length} new price snapshots to the database.`,
            );
        }

        // Step 5: Update the cache IN BULK for ALL tokens.
        const cacheItemsToSet: CacheMSetItem<CachedPriceData>[] = [];
        const cacheItemsToSetWithTTL: CacheMSetItem<CachedPriceData>[] = [];

        // Add the "latest" price for every token in the batch
        priceUpdates.forEach((p) => {
            cacheItemsToSet.push({
                key: this.cacheService.getCacheKey('prices-latest', {
                    tokenId: p.tokenId,
                }),
                value: {
                    price: p.priceUsd.toString(),
                },
            });
        });

        // Add the "daily" snapshot for the tokens we just wrote to the DB
        tokenPricesToCreateInDb.forEach((p) => {
            cacheItemsToSetWithTTL.push({
                key: this.cacheService.getCacheKey('prices-daily', {
                    tokenId: p.tokenId,
                    date: todayDateString,
                }),
                value: {
                    price: p.priceUsd.toString(),
                },
                ttlInSeconds: CACHE_TTL_ONE_WEEK,
            });
        });

        if (cacheItemsToSet.length > 0) {
            await this.cacheService.mset(cacheItemsToSet);
            this.logger.debug(
                `Set ${cacheItemsToSet.length} prices-latest in cache without TTL.`,
            );
        }

        if (cacheItemsToSetWithTTL.length > 0) {
            await this.cacheService.mset(cacheItemsToSetWithTTL);
            this.logger.debug(
                `Set ${cacheItemsToSetWithTTL.length} prices-daily in cache with TTL CACHE_TTL_ONE_WEEK.`,
            );
        }
    }

    /**
     * Gets current prices and price changes for a list of tokens based on the latest price and the
     * daily snapshot from 24 hours ago. Reads exclusively from the cache in a single bulk operation.
     *
     * @param tokenIds A list of token IDs for which to calculate price changes.
     * @returns An array of price info.
     */
    public async getPricesInfo(tokenIds: string[]): Promise<PriceInfo[]> {
        if (tokenIds.length === 0) {
            return [];
        }

        // --- Step 1: Prepare All Keys ---
        // First, figure out all the cache keys we will need to fetch.

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayDateString = getUTCDateString(yesterday);

        const latestPriceKeys = tokenIds.map((id) =>
            this.cacheService.getCacheKey('prices-latest', { tokenId: id }),
        );

        const historicalPriceKeys = tokenIds.map((id) =>
            this.cacheService.getCacheKey('prices-daily', {
                tokenId: id,
                date: yesterdayDateString,
            }),
        );

        // --- Step 2: Fetch All Data from Cache in One Command ---
        // Combine both lists of keys into one big list.
        const allKeys = [...latestPriceKeys, ...historicalPriceKeys];

        // Send this single, combined list to Redis using mget.
        // This is ONE command and ONE network trip for all the data we need.
        const cacheResults =
            await this.cacheService.mgetWithMetadata<CachedPriceData>(allKeys);

        // --- Step 3: Process the Results ---
        // Now, "un-merge" the flat array of results and calculate the changes.

        const results: PriceInfo[] = [];
        const numTokens = tokenIds.length;
        const now = Date.now();

        for (let i = 0; i < numTokens; i++) {
            const tokenId = tokenIds[i];

            // The first half of cacheResults contains the latest prices.
            const latestPriceResult = cacheResults[i];

            // The second half of cacheResults contains the historical prices.
            const historicalPriceResult = cacheResults[i + numTokens];

            // If we don't even have a current price, we can't calculate a change.
            if (!latestPriceResult) {
                this.logger.warn(
                    `No latest price found in cache for token: ${tokenId}`,
                );
                continue;
            }

            // Destructure the result for clarity
            const { value: latestPriceData, ageInSeconds } = latestPriceResult;

            // Calculate the timestamp from the cache metadata
            const timestamp = new Date(now - ageInSeconds * 1000);

            const currentPriceUsd = new Decimal(latestPriceData.price);
            let priceUsdChange: Decimal | undefined = undefined;

            // If a historical price exists, calculate the absolute change.
            if (historicalPriceResult) {
                const historicalPriceUsd = new Decimal(
                    historicalPriceResult.value.price,
                );
                priceUsdChange = currentPriceUsd.minus(historicalPriceUsd);
            }

            results.push({
                tokenId,
                currentPriceUsd,
                priceUsdChange,
                timestamp,
            });
        }

        return results;
    }
}
