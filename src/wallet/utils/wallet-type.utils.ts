import { ChainType, WalletType } from '@prisma/client';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import {
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { LogExecutionTime } from '@/common/decorators/log-execution-time.decorator';
import {
    WALLET_TYPE_PROVIDER,
    WalletTypeProvider,
} from '@/wallet/interfaces/wallet-type-provider.interface';

@Injectable()
export class WalletTypeUtils {
    private readonly logger: AppLoggerService;

    constructor(
        @Inject(WALLET_TYPE_PROVIDER)
        private readonly walletTypeProvider: WalletTypeProvider,
    ) {
        this.logger = new AppLoggerService(WalletTypeUtils.name);
    }

    private async isEVMSmartContract(address: string): Promise<boolean> {
        return this.walletTypeProvider.isEVMSmartContract(address);
    }

    @LogExecutionTime()
    public async getWalletType(
        address: string,
        chainType: ChainType,
    ): Promise<WalletType> {
        switch (chainType) {
            case ChainType.EVM:
                return (await this.isEVMSmartContract(address))
                    ? WalletType.SMART
                    : WalletType.SIMPLE;
            case ChainType.CAIROVM:
                return WalletType.SMART; // All CairoVM addresses are smart contracts
            default:
                this.logger.error(`Unhandled ChainType`);
                throwLogged(
                    new InternalServerErrorException('Internal server error'),
                );
        }
    }
}
