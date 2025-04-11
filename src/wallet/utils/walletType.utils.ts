import { ChainType, WalletType } from '@prisma/client';
import { Alchemy, Network } from 'alchemy-sdk';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import { InternalServerErrorException } from '@nestjs/common';

const logger = new AppLoggerService('WalletTypeUtils');

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
if (!ALCHEMY_API_KEY) {
    logger.error('Missing Alchemy API key');
    throwLogged(new InternalServerErrorException('Internal server error'));
}

// Internal network list
const EVMNetworksToCheck = [
    Network.ETH_MAINNET,
    Network.BNB_MAINNET,
    Network.BASE_MAINNET,
    Network.ARB_MAINNET,
    Network.AVAX_MAINNET,
    Network.SONIC_MAINNET,
    Network.MATIC_MAINNET,
    Network.OPT_MAINNET,
    Network.ZKSYNC_MAINNET,
    Network.MANTLE_MAINNET,
    Network.BERACHAIN_MAINNET,
    Network.BLAST_MAINNET,
    Network.LINEA_MAINNET,
    Network.SCROLL_MAINNET,
    Network.GNOSIS_MAINNET,
    Network.UNICHAIN_MAINNET,
];

// Internal storage for Alchemy instances
let alchemyInstances: Record<Network, Alchemy>;

// Internal function to findOrCreate instances (not exported)
function createAlchemyInstances(apiKey: string): Record<Network, Alchemy> {
    const instances: Record<Network, Alchemy> = {} as Record<Network, Alchemy>;
    for (const network of EVMNetworksToCheck) {
        instances[network] = new Alchemy({
            apiKey,
            network,
        });
    }
    return instances;
}

// Exported function: only takes an address, handles everything internally
export async function isEVMSmartContract(address: string): Promise<boolean> {
    if (!alchemyInstances) {
        alchemyInstances = createAlchemyInstances(ALCHEMY_API_KEY);
    }

    const checks = EVMNetworksToCheck.map(async (network) => {
        try {
            const code = await alchemyInstances[network].core.getCode(address);
            return code !== '0x' && code.length > 2;
        } catch (error) {
            logger.warn(
                `Failed to get checksum EVM address ${address} on ${network}: ${error}`,
            );
            return false;
        }
    });

    const results = await Promise.allSettled(checks);

    return results.some(
        (res) => res.status === 'fulfilled' && res.value === true,
    );
}

export async function getWalletType(
    address: string,
    chainType: ChainType,
): Promise<WalletType> {
    switch (chainType) {
        case ChainType.EVM:
            return (await isEVMSmartContract(address))
                ? WalletType.SMART
                : WalletType.SIMPLE;
        case ChainType.CAIROVM:
            return WalletType.SMART; // All CairoVM addresses are smart contracts
        default:
            logger.error(`Unhandled ChainType`);
            throwLogged(
                new InternalServerErrorException('Internal server error'),
            );
    }
}
