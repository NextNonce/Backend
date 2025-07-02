import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { WalletService } from '@/wallet/wallet.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { PortfolioWallet, Wallet } from '@prisma/client';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { CreatePortfolioWalletDto } from '@/portfolio-wallet/dto/create-portfolio-wallet.dto';
import { ConfigService } from '@nestjs/config';
import { CACHE_TTL_FOUR_WEEKS, CACHE_TTL_ONE_WEEK } from '@/cache/constants/cache.constants';

@Injectable()
export class PortfolioWalletService {
    private readonly logger: AppLoggerService;
    private readonly isTestingMode: boolean;
    private readonly testingCacheTTL: number;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        @Inject(forwardRef(() => PortfolioService))
        private readonly portfolioService: PortfolioService,
        private readonly walletService: WalletService,
        private readonly configService: ConfigService,
    ) {
        this.logger = new AppLoggerService(PortfolioWalletService.name);
        this.isTestingMode = this.configService.get('MODE') === 'testing';
        this.testingCacheTTL = 5;
    }

    async findAll(
        portfolioId: string,
        userId: string,
    ): Promise<{ portfolioWallet: PortfolioWallet; wallet: Wallet }[]> {
        await this.portfolioService.findOneAndVerifyAccess({
            id: portfolioId,
            userId,
            requireOwnership: false,
        });

        return (
            (await this.getCachedAll(portfolioId)) ??
            (await this.fetchAll(portfolioId))
        );
    }

    async addWallet(
        portfolioId: string,
        userId: string,
        createPortfolioWalletDto: CreatePortfolioWalletDto,
    ): Promise<{ portfolioWallet: PortfolioWallet; wallet: Wallet }> {
        this.logger.debug(
            `Adding wallet to portfolio ${portfolioId} for user ${userId} with data ${JSON.stringify(
                createPortfolioWalletDto,
            )}`,
        );
        await this.portfolioService.findOneAndVerifyAccess({
            id: portfolioId,
            userId,
            requireOwnership: true, // Only the owner can add wallets
        });

        const cachedPortfolioWalletRecord =
            await this.getCachedPortfolioWalletRecord(
                portfolioId,
                createPortfolioWalletDto.address,
            );
        if (cachedPortfolioWalletRecord) {
            this.logger.log(
                `Getting cached portfolio wallet record ${JSON.stringify(
                    cachedPortfolioWalletRecord,
                )}`,
            );
            return cachedPortfolioWalletRecord;
        }
        return await this.upsertPortfolioWalletRecord(
            portfolioId,
            userId,
            createPortfolioWalletDto,
        );
    }

    async delCachedAll(portfolioId: string) {
        const cacheKeyAll = this.cacheService.getCacheKey('portfolioWallets', {
            portfolioId,
        });
        await this.cacheService.del(cacheKeyAll);
    }

    private async upsertPortfolioWalletRecord(
        portfolioId: string,
        userId: string,
        createPortfolioWalletDto: CreatePortfolioWalletDto,
    ): Promise<{ portfolioWallet: PortfolioWallet; wallet: Wallet }> {
        this.logger.log(
            `Adding wallet with address ${createPortfolioWalletDto.address} to portfolio ${portfolioId} of user ${userId}`,
        );

        const portfolioWalletRecord = await this.databaseService.$transaction(
            async (db) => {
                const wallet: Wallet = await this.walletService.findOrCreate(
                    createPortfolioWalletDto.address,
                    db,
                );
                const portfolioWallet: PortfolioWallet =
                    await db.portfolioWallet.upsert({
                        where: {
                            portfolioId_walletId: {
                                portfolioId: portfolioId,
                                walletId: wallet.id,
                            },
                        },
                        update: {},
                        create: {
                            portfolioId: portfolioId,
                            walletId: wallet.id,
                            name: createPortfolioWalletDto.name,
                        },
                    });
                return { portfolioWallet, wallet };
            },
        );
        this.logger.log(
            `Created portfolio wallet record ${JSON.stringify(
                portfolioWalletRecord,
            )}`,
        );
        await this.cachePortfolioWalletRecord(portfolioWalletRecord);
        await this.patchCachedAll(portfolioId, portfolioWalletRecord);
        return portfolioWalletRecord;
    }

    private async fetchAll(
        portfolioId: string,
    ): Promise<{ portfolioWallet: PortfolioWallet; wallet: Wallet }[]> {
        const walletLinks = await this.databaseService.portfolioWallet.findMany(
            {
                where: { portfolioId },
                orderBy: { createdAt: 'asc' },
                include: { wallet: true },
            },
        );
        const result = walletLinks.map((link) => ({
            portfolioWallet: {
                id: link.id,
                name: link.name,
                portfolioId: link.portfolioId,
                walletId: link.walletId,
                createdAt: link.createdAt,
                updatedAt: link.updatedAt,
            },
            wallet: link.wallet,
        }));
        const sortedResult = result.sort(
            (a, b) =>
                a.portfolioWallet.createdAt.getTime() -
                b.portfolioWallet.createdAt.getTime(),
        );
        this.logger.debug(`Found portfolio wallets ${JSON.stringify(sortedResult)}`);
        await this.cacheAll(portfolioId, sortedResult);
        return sortedResult;
    }

    private async cachePortfolioWalletRecord(portfolioWalletRecord: {
        portfolioWallet: PortfolioWallet;
        wallet: Wallet;
    }) {
        const cacheKey = this.cacheService.getCacheKey('portfolioWallet', {
            portfolioId: portfolioWalletRecord.portfolioWallet.portfolioId,
            walletAddress: portfolioWalletRecord.wallet.address,
        });
        await this.cacheService.set(
            cacheKey,
            portfolioWalletRecord,
            this.isTestingMode ? this.testingCacheTTL : CACHE_TTL_ONE_WEEK,
        );
    }

    private async getCachedPortfolioWalletRecord(
        portfolioId: string,
        walletAddress: string,
    ): Promise<
        { portfolioWallet: PortfolioWallet; wallet: Wallet } | undefined
    > {
        const cacheKey = this.cacheService.getCacheKey('portfolioWallet', {
            portfolioId,
            walletAddress,
        });
        return await this.cacheService.get(cacheKey);
    }

    private async cacheAll(
        portfolioId: string,
        PortfolioWalletRecords: {
            portfolioWallet: PortfolioWallet;
            wallet: Wallet;
        }[],
    ) {
        const cacheKeyAll = this.cacheService.getCacheKey('portfolioWallets', {
            portfolioId,
        });
        await this.cacheService.set(
            cacheKeyAll,
            PortfolioWalletRecords,
            this.isTestingMode ? this.testingCacheTTL : CACHE_TTL_FOUR_WEEKS,
        );
    }

    private async patchCachedAll(
        portfolioId: string,
        newEntry: { portfolioWallet: PortfolioWallet; wallet: Wallet },
    ) {
        // 1) Try to read the existing cached list
        const existing = await this.getCachedAll(portfolioId);

        // 2) If it exists, append; otherwise start a new array
        const updated = existing ? [...existing, newEntry] : [newEntry];

        // 3) Write it back with the same TTL as cacheAll
        await this.cacheAll(portfolioId, updated);
    }

    private async getCachedAll(
        portfolioId: string,
    ): Promise<
        { portfolioWallet: PortfolioWallet; wallet: Wallet }[] | undefined
    > {
        const cacheKeyAll = this.cacheService.getCacheKey('portfolioWallets', {
            portfolioId,
        });
        return await this.cacheService.get(cacheKeyAll);
    }
}
