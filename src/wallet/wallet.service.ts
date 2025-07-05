import { BadRequestException, Injectable } from '@nestjs/common';

import { ChainType, Prisma, Wallet, WalletType } from '@prisma/client';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AddressUtils } from '@/wallet/utils/address.utils';
import { WalletTypeUtils } from '@/wallet/utils/wallet-type.utils';
import { CACHE_TTL_ONE_WEEK } from '@/cache/constants/cache.constants';

@Injectable()
export class WalletService {
    private readonly logger: AppLoggerService;
    private readonly isTestingMode: boolean;
    private readonly testingCacheTTL: number;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
        private readonly walletTypeUtils: WalletTypeUtils,
        private readonly addressUtils: AddressUtils,
    ) {
        this.logger = new AppLoggerService(WalletService.name);
        this.isTestingMode = this.configService.get('MODE') === 'testing';
        this.testingCacheTTL = 5;
    }

    async findOrCreate(
        walletAddress: string,
    ): Promise<Wallet> {
        const { existingWallet, creationData } = await this.resolveWalletData(walletAddress);

        if (existingWallet) {
            return existingWallet;
        }

        const wallet = await this.upsertInTransaction(creationData!, this.databaseService);
        await this.afterUpsert(wallet);
        return wallet
    }

    /**
     * Gathers all data needed to create a wallet.
     * Checks if the wallet exists first to avoid network calls.
     */
    public async resolveWalletData(walletAddress: string): Promise<{
        existingWallet?: Wallet;
        creationData?: { address: string; chainType: ChainType; walletType: WalletType };
    }> {
        const { address, chainType } = this.extractAddressAndChainType(walletAddress);

        // 1. Check DB first to avoid a slow network call if possible
        const existingWallet =  await this.findByAddress(address);

        if (existingWallet) {
            return { existingWallet };
        }

        // 2. Wallet is new, so we call getWalletType
        const walletType = await this.walletTypeUtils.getWalletType(address, chainType);

        // 3. Return the data needed to create the new wallet
        return { creationData: { address, chainType, walletType } };
    }

    public async upsertInTransaction(
        walletData: { address: string; walletType: WalletType; chainType: ChainType },
        prisma: Prisma.TransactionClient | DatabaseService,
    ): Promise<Wallet> {
        this.logger.log(
            `Upserting wallet with address ${walletData.address}, wallet type ${walletData.walletType}, chain type ${walletData.chainType}.`,
        );
        try {
            return await prisma.wallet.upsert({
                where: {
                    address: walletData.address,
                },
                update: {},
                create: {
                    address: walletData.address,
                    walletType: walletData.walletType,
                    chainType: walletData.chainType,
                },
            });
        } catch (err) {
            const error = err as Error;
            // Handle unique constraint error: if duplicate, fetch the existing wallet
            if ((error as PrismaClientKnownRequestError).code === 'P2002') {
                this.logger.warn(
                    `Wallet with address ${walletData.address} already exists, fetching existing wallet.`,
                );
                const existingWallet = await prisma.wallet.findFirst({
                    where: { address: walletData.address },
                }) || undefined;

                if (!existingWallet) {
                    // This is a safeguard for a very unlikely scenario
                    throw new Error(`Fatal: Could not find wallet ${walletData.address} after a P2202 error.`);
                }
                return existingWallet;
            }
            throw error;
        }
    }


    public async afterUpsert(wallet: Wallet): Promise<void> {
        await this.cacheWalletByAddress(wallet, wallet.address);
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
            if (wallet) {
                this.logger.debug(
                    `Wallet with address ${address} is fetched from DB by address`,
                );
                await this.cacheWalletByAddress(wallet, address);
            }
        }
        if (!wallet) {
            this.logger.warn(`Wallet with address ${address} not found`);
            return undefined;
        }
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
        this.logger.debug(
            `Wallet with id ${id} and address ${wallet.address} is fetched from DB by id`,
        );
        await this.cacheService.set(
            cacheKey,
            wallet,
            this.isTestingMode ? this.testingCacheTTL : CACHE_TTL_ONE_WEEK,
        );
        return wallet;
    }

    private extractAddressAndChainType(walletAddress: string) {
        const chainType: ChainType | undefined =
            this.addressUtils.getChainType(walletAddress);
        if (!chainType) {
            this.logger.error(
                `Failed to get chain type for address: ${walletAddress}`,
            );
            throwLogged(new BadRequestException('Invalid wallet address'));
        }
        const address: string = this.addressUtils.normalizeWalletAddress(
            walletAddress,
            chainType,
        );
        return { address, chainType };
    }

    private async cacheWalletByAddress(wallet: Wallet, address: string) {
        const pointerKey = this.cacheService.getCacheKey('wallet:address', {
            address,
        });
        const canonicalKey = this.cacheService.getCacheKey('wallet', wallet.id);
        await this.cacheService.set(
            pointerKey,
            wallet.id,
            this.isTestingMode ? this.testingCacheTTL : CACHE_TTL_ONE_WEEK,
        );
        await this.cacheService.set(
            canonicalKey,
            wallet,
            this.isTestingMode ? this.testingCacheTTL : CACHE_TTL_ONE_WEEK,
        );
    }

    private async getCachedWalletByAddress(
        address: string,
    ): Promise<Wallet | undefined> {
        const pointerKey = this.cacheService.getCacheKey('wallet:address', {
            address,
        });
        const walletId = await this.cacheService.get<string>(pointerKey);
        if (!walletId) {
            return undefined;
        }
        const canonicalKey = this.cacheService.getCacheKey('wallet', walletId);
        const cachedWallet = await this.cacheService.get<Wallet>(canonicalKey);
        if (!cachedWallet) {
            return undefined;
        }
        return cachedWallet;
    }
}
