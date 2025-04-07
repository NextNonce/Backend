import { ChainType } from '@prisma/client';
import { isAddress, getAddress } from 'ethers';
import { validateAndParseAddress, getChecksumAddress } from 'starknet';
import { STARKNET_ADDRESS_LENGTH } from '@/wallet/constants/address.constants';
import { throwLogged } from '@/common/helpers/error.helper';
import { BadRequestException } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';

const logger = new AppLoggerService('AddressUtils');

export function isStarknetAddress(address: string): boolean {
    if (address.length !== STARKNET_ADDRESS_LENGTH) return false;
    try {
        validateAndParseAddress(address);
        return true;
    } catch {
        return false;
    }
}

export function isEVMAddress(address: string): boolean {
    return isAddress(address);
}

export function getChainType(address: string): ChainType | undefined {
    if (isEVMAddress(address)) return ChainType.EVM;
    if (isStarknetAddress(address)) return ChainType.CAIROVM;

    return undefined;
}

export function normalizeEVMAddress(address: string): string {
    try {
        return getAddress(address.toLowerCase());
    } catch {
        logger.warn(`Failed to get checksum EVM address: ${address}`);
        throwLogged(new BadRequestException('Invalid address'));
    }
}

export function normalizeStarknetAddress(address: string): string {
    try {
        return getChecksumAddress(address.toLowerCase());
    } catch {
        logger.warn(`Failed to get checksum Starknet address: ${address}`);
        throwLogged(new BadRequestException('Invalid address'));
    }
}

export function normalizeWalletAddress(
    address: string,
    chain: ChainType,
): string {
    switch (chain) {
        case ChainType.EVM:
            return normalizeEVMAddress(address);
        case ChainType.CAIROVM:
            return normalizeStarknetAddress(address);
        default:
            logger.error(`Unhandled ChainType`);
            throwLogged(new BadRequestException('Invalid chain type'));
    }
}
