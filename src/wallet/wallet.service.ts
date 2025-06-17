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

@Injectable()
export class WalletService {
    private readonly logger: AppLoggerService;
    private readonly addressUtils: AddressUtils;
    private readonly walletTypeUtils: WalletTypeUtils;
    private readonly isTestingMode: boolean;
    private readonly testingCacheTTL: number;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
    ) {
        this.logger = new AppLoggerService(WalletService.name);
        this.addressUtils = new AddressUtils();
        this.walletTypeUtils = new WalletTypeUtils();
        this.isTestingMode = this.configService.get('MODE') === 'testing';
        this.testingCacheTTL = 5;
    }

    async findOrCreate(
        walletAddress: string,
        db?: Prisma.TransactionClient,
    ): Promise<Wallet> {
        const { address, chainType } =
            this.extractAddressAndChainType(walletAddress);
        let prisma: DatabaseService | Prisma.TransactionClient;
        if (!db) {
            prisma = this.databaseService;
            const wallet: Wallet | undefined =
                await this.findByAddress(address);
            if (wallet) {
                return wallet;
            }
        } else {
            prisma = db;
        }
        const walletType: WalletType = await this.walletTypeUtils.getWalletType(address, chainType);
        this.logger.log(
            `Upserting wallet with address ${address} and type ${walletType}.`,
        );
        try {
            const wallet: Wallet = await prisma.wallet.upsert({
                where: {
                    address,
                },
                update: {},
                create: {
                    address,
                    walletType,
                    chainType,
                },
            });
            if (!db) await this.cacheWalletByAddress(wallet, address); // can be dangerous if transaction fails
            return wallet;
        } catch (err) {
            const error = err as Error;
            // Handle unique constraint error: if duplicate, fetch the existing wallet
            if ((error as PrismaClientKnownRequestError).code === 'P2002') {
                this.logger.warn(
                    `Wallet with address ${address} already exists, fetching existing wallet.`,
                );
                const existingWallet = await this.findByAddress(address);
                if (existingWallet) return existingWallet;
            }
            throw error;
        }

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
                this.logger.debug(`Wallet with address ${address} is fetched from DB by address`);
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
        this.logger.debug(`Wallet with id ${id} and address ${wallet.address} is fetched from DB by id`);
        await this.cacheService.set(
            cacheKey,
            wallet,
            this.isTestingMode ? this.testingCacheTTL : 60 * 60,
        );
        return wallet;
    }

    private extractAddressAndChainType(walletAddress: string) {
        const chainType: ChainType | undefined = this.addressUtils.getChainType(walletAddress);
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
            address
        });
        const canonicalKey = this.cacheService.getCacheKey('wallet', wallet.id);
        await this.cacheService.set(
            pointerKey,
            wallet.id,
            this.isTestingMode ? this.testingCacheTTL : 60 * 60,
        );
        await this.cacheService.set(
            canonicalKey,
            wallet,
            this.isTestingMode ? this.testingCacheTTL : 60 * 60,
        );
    }

    private async getCachedWalletByAddress(
        address: string,
    ): Promise<Wallet | undefined> {
        const pointerKey = this.cacheService.getCacheKey('wallet:address', {
            address
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
