import { BadRequestException, Injectable } from '@nestjs/common';
import {
    getChainType,
    getWalletType,
    normalizeWalletAddress,
} from '@/wallet/utils';
import { ChainType, Wallet, WalletType } from '@prisma/client';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';

@Injectable()
export class WalletService {
    private readonly logger: AppLoggerService;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {
        this.logger = new AppLoggerService(WalletService.name);
    }
    async create(walletAddress: string, portfolioId?: string): Promise<Wallet> {
        const { address, chainType } =
            this.extractAddressAndChainType(walletAddress);
        const existingWallet: Wallet | undefined =
            await this.findByAddress(address);
        if (existingWallet) {
            return this.handleExistingWallet(
                existingWallet,
                address,
                portfolioId,
            );
        }
        // Determine the wallet type based on address and chain type
        const walletType: WalletType = await getWalletType(address, chainType);
        this.logger.log(
            `Creating wallet with address ${address} and type ${walletType}.`,
        );
        const wallet: Wallet = await this.databaseService.wallet.create({
            data: {
                address,
                walletType,
                chainType,
                ...(portfolioId && {
                    portfolios: { connect: { id: portfolioId } },
                }),
            },
        });

        if (portfolioId) await this.delCacheByPortfolioId(portfolioId);
        const cacheKey = this.cacheService.getCacheKey('wallet', wallet.id);
        await this.cacheService.set(cacheKey, wallet, 60 * 60);
        return wallet;
    }

    async findById(id: string): Promise<Wallet | undefined> {
        const cacheKey = this.cacheService.getCacheKey('wallet', id);
        const cachedWallet: Wallet | undefined =
            await this.cacheService.get(cacheKey);
        if (cachedWallet) {
            return cachedWallet;
        }
        const wallet: Wallet | null =
            await this.databaseService.wallet.findFirst({
                where: {
                    id,
                },
            });
        if (!wallet) {
            this.logger.warn(`Wallet with id ${id} not found`);
            return undefined;
        }
        await this.cacheService.set(cacheKey, wallet, 60 * 60);
        return wallet;
    }

    async findByAddress(address: string): Promise<Wallet | undefined> {
        const pointerKey = this.cacheService.getCacheKey('wallet:address', {
            address,
        });
        const walletId: string | undefined =
            await this.cacheService.get<string>(pointerKey);
        let wallet: Wallet | undefined;
        if (walletId) {
            wallet = await this.findById(walletId);
        } else {
            wallet =
                (await this.databaseService.wallet.findFirst({
                    where: { address },
                })) ?? undefined;
            if (wallet) await this.cacheWalletByPointerKey(wallet, pointerKey);
        }
        if (!wallet) {
            this.logger.warn(`Wallet with address ${address} not found`);
            return undefined;
        }
        await this.cacheService.set(pointerKey, wallet.id, 60 * 60);
        return wallet;
    }

    async findAll(portfolioId: string): Promise<Wallet[]> {
        const cacheKeyAll = this.cacheService.getCacheKey('wallets', {
            portfolioId,
        });
        const cachedWallets: Wallet[] | undefined =
            await this.cacheService.get(cacheKeyAll);
        if (cachedWallets) {
            return cachedWallets;
        }
        const wallets: Wallet[] | null =
            await this.databaseService.wallet.findMany({
                where: {
                    portfolios: { some: { id: portfolioId } },
                },
            });
        if (!wallets) {
            this.logger.warn(`No wallets found for portfolio ${portfolioId}`);
            return [];
        }
        await this.cacheService.set(cacheKeyAll, wallets, 60 * 60);
        return wallets;
    }


    private extractAddressAndChainType(walletAddress: string) {
        const chainType: ChainType | undefined = getChainType(walletAddress);
        if (!chainType) {
            this.logger.error(
                `Failed to get chain type for address: ${walletAddress}`,
            );
            throwLogged(new BadRequestException('Invalid wallet address'));
        }
        const address: string = normalizeWalletAddress(
            walletAddress,
            chainType,
        );
        return { address, chainType };
    }


    private async handleExistingWallet(
        wallet: Wallet,
        address: string,
        portfolioId?: string,
    ): Promise<Wallet> {
        if (portfolioId) {
            await this.delCacheByPortfolioId(portfolioId);
            const updatedWallet: Wallet =
                await this.databaseService.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        portfolios: {
                            connect: { id: portfolioId },
                        },
                    },
                });
            this.logger.log(
                `Wallet with address ${address} already exists; linked to portfolio ${portfolioId}.`,
            );
            return updatedWallet;
        }

        this.logger.log(`Wallet with address ${address} already exists.`);
        return wallet;
    }

    private async cacheWalletByPointerKey(wallet: Wallet, pointerKey: string) {
        const canonicalKey = this.cacheService.getCacheKey('wallet', wallet.id);
        await this.cacheService.set(pointerKey, wallet.id, 60 * 60);
        await this.cacheService.set(canonicalKey, wallet, 60 * 60);
    }

    // Clear cache for the all wallets in the portfolio
    private async delCacheByPortfolioId(portfolioId: string) {
        const cacheKeyAll = this.cacheService.getCacheKey('wallets', {
            portfolioId,
        });
        await this.cacheService.del(cacheKeyAll);
    }
}
