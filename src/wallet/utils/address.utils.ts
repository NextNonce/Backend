import { ChainType } from '@prisma/client';
import { isAddress, getAddress } from 'ethers';
import { validateAndParseAddress, getChecksumAddress } from 'starknet';
import { STARKNET_ADDRESS_LENGTH } from '@/wallet/constants/address.constants';
import { throwLogged } from '@/common/helpers/error.helper';
import { BadRequestException } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';

export class AddressUtils {
    private readonly logger: AppLoggerService;

    constructor() {
        this.logger = new AppLoggerService('AddressUtils');
    }

    public isStarknetAddress(address: string): boolean {
        if (address.length !== STARKNET_ADDRESS_LENGTH) return false;
        try {
            validateAndParseAddress(address.toLowerCase());
            return true;
        } catch {
            return false;
        }
    }

    public isEVMAddress(address: string): boolean {
        return isAddress(address.toLowerCase());
    }

    public getChainType(address: string): ChainType | undefined {
        if (this.isEVMAddress(address)) return ChainType.EVM;
        this.logger.debug(`Invalid EVM address: ${address}`);
        if (this.isStarknetAddress(address)) return ChainType.CAIROVM;
        this.logger.debug(`Invalid Starknet address: ${address}`);
        return undefined;
    }

    public normalizeEVMAddress(address: string): string {
        try {
            return getAddress(address.toLowerCase());
        } catch {
            this.logger.warn(`Failed to get checksum EVM address: ${address}`);
            throwLogged(new BadRequestException('Invalid address'));
        }
    }

    public normalizeStarknetAddress(address: string): string {
        try {
            return getChecksumAddress(address.toLowerCase());
        } catch {
            this.logger.warn(
                `Failed to get checksum Starknet address: ${address}`,
            );
            throwLogged(new BadRequestException('Invalid address'));
        }
    }

    public normalizeWalletAddress(address: string, chain: ChainType): string {
        switch (chain) {
            case ChainType.EVM:
                return this.normalizeEVMAddress(address);
            case ChainType.CAIROVM:
                return this.normalizeStarknetAddress(address);
            default:
                this.logger.error(`Unhandled ChainType`);
                throwLogged(new BadRequestException('Invalid chain type'));
        }
    }
}
