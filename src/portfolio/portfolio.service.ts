import {
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { Portfolio, PortfolioAccess, PortfolioWallet, Prisma, Wallet } from '@prisma/client';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import { PortfolioWalletService } from '@/portfolio-wallet/portfolio-wallet.service';
import { CACHE_TTL_ONE_WEEK } from '@/cache/constants/cache.constants';
import { PortfolioBalancesDto } from '@/balance/dto/portfolio-balances.dto';
import { BalanceService } from '@/balance/balance.service';

@Injectable()
export class PortfolioService {
    private readonly logger: AppLoggerService;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly balanceService: BalanceService,
        @Inject(forwardRef(() => PortfolioWalletService))
        private readonly portfolioWalletService: PortfolioWalletService,
    ) {
        this.logger = new AppLoggerService(PortfolioService.name);
    }
    async create(
        userId: string,
        createPortfolioDto: CreatePortfolioDto,
        db?: Prisma.TransactionClient,
    ): Promise<Portfolio> {
        const prisma = db || this.databaseService;
        const portfolio: Portfolio = await prisma.portfolio.create({
            data: {
                ...createPortfolioDto,
                ownerId: userId,
            },
        });
        this.logger.log(
            `User ${userId} created portfolio ${JSON.stringify(portfolio)}`,
        );
        const cacheKey = this.cacheService.getCacheKey(
            'portfolio',
            portfolio.id,
        );
        await this.cacheService.set(cacheKey, portfolio, CACHE_TTL_ONE_WEEK);
        const cacheKeyAll = this.cacheService.getCacheKey('portfolios', {
            userId,
        });
        await this.cacheService.del(cacheKeyAll);
        return portfolio;
    }

    async findAll(userId: string): Promise<Portfolio[]> {
        const cacheKeyAll = this.cacheService.getCacheKey('portfolios', {
            userId,
        });
        const cachedPortfolios: Portfolio[] | undefined =
            await this.cacheService.get(cacheKeyAll);
        if (cachedPortfolios) {
            return cachedPortfolios;
        }
        const portfolios: Portfolio[] =
            await this.databaseService.portfolio.findMany({
                where: { ownerId: userId },
            });
        const sortedPortfolios =
            portfolios.sort((a: Portfolio, b: Portfolio) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        await this.cacheService.set(
            cacheKeyAll,
            sortedPortfolios,
            CACHE_TTL_ONE_WEEK,
        );
        return sortedPortfolios;
    }

    async findOneAndVerifyAccess({
        id,
        userId,
        requireOwnership = true,
    }: {
        id: string;
        userId: string;
        requireOwnership?: boolean;
    }): Promise<Portfolio> {
        this.logger.log(
            `Call findOneAndVerifyAccess with portfolio id ${id} and userId ${userId}`,
        );
        const cacheKey = this.cacheService.getCacheKey('portfolio', id);
        let portfolio: Portfolio | undefined | null =
            await this.cacheService.get(cacheKey);
        if (!portfolio) {
            portfolio = await this.databaseService.portfolio.findFirst({
                where: {
                    id,
                    ownerId: userId,
                },
            });
            if (!portfolio) {
                this.logger.warn(`Portfolio with id ${id} not found`);
                throwLogged(new NotFoundException(`Portfolio not found`));
            }
        }
        // For modification endpoints (requireOwnership), ensure the user is the owner.
        if (requireOwnership && portfolio.ownerId !== userId) {
            this.logger.warn(
                `User ${userId} that is not the owner of portfolio ${id} is trying to modify it`,
            );
            throwLogged(
                new ForbiddenException(
                    'You are not authorized to modify this portfolio',
                ),
            );
        }
        // For read endpoints: if the portfolio is PRIVATE, only allow the owner.
        if (
            !requireOwnership &&
            portfolio.portfolioAccess === PortfolioAccess.PRIVATE &&
            portfolio.ownerId !== userId
        ) {
            this.logger.warn(
                `User ${userId} that is not the owner of a private portfolio ${id} is tying to access it`,
            );
            throwLogged(new NotFoundException(`Portfolio not found`));
        }

        await this.cacheService.set(cacheKey, portfolio, CACHE_TTL_ONE_WEEK);
        return portfolio;
    }

    async getCachedBalances(
        portfolioId: string,
        userId: string,
    ): Promise<PortfolioBalancesDto> {
        const wallets: { portfolioWallet: PortfolioWallet; wallet: Wallet }[] = await this.portfolioWalletService.findAll(
            portfolioId,
            userId,
        );

        return await this.balanceService.getPortfolioBalancesFromCache(
            wallets.map((wallet) => wallet.wallet.address),
        );
    }

    /*async update(id: number, updatePortfolioDto: UpdatePortfolioDto) {
        return `This action updates a #${id} portfolio`;
    }*/ // For now user can't update their only portfolio

    async delCachedAll(userId: string) {
        const cacheKeyAll = this.cacheService.getCacheKey('portfolios', {
            userId,
        });
        const cachedPortfolios: Portfolio[] | undefined =
            await this.cacheService.get(cacheKeyAll);
        if (!cachedPortfolios) return;
        await Promise.all(
            cachedPortfolios.map(async (portfolio) => {
                // first delete the portfolio key
                await this.cacheService.del(
                    this.cacheService.getCacheKey('portfolio', portfolio.id),
                );
                // then delete all the wallet‑cache for that portfolio
                await this.portfolioWalletService.delCachedAll(portfolio.id);
            }),
        );
        this.logger.log(
            `User ${userId} deleted all his cached portfolios ${JSON.stringify(cachedPortfolios)}`,
        );
        await this.cacheService.del(cacheKeyAll);
    }
}
