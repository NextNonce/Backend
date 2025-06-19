import { ChainType, WalletType } from '@prisma/client';
import { Alchemy, Network } from 'alchemy-sdk';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import { InternalServerErrorException } from '@nestjs/common';
import { LogExecutionTime } from '@/common/decorators/log-execution-time.decorator';

export class WalletTypeUtils {
    private readonly logger: AppLoggerService;
    private readonly ALCHEMY_API_KEY: string;
    private readonly alchemyInstances: Record<Network, Alchemy>;

    // List of networks to check for EVM contracts
    private readonly EVMNetworksToCheck: Network[] = [
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

    constructor() {
        this.logger = new AppLoggerService(WalletTypeUtils.name);
        this.ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
        if (!this.ALCHEMY_API_KEY) {
            this.logger.error('Missing Alchemy API key');
            throwLogged(
                new InternalServerErrorException('Internal server error'),
            );
        }
        // Initialize Alchemy instances immediately
        this.alchemyInstances = this.createAlchemyInstances(
            this.ALCHEMY_API_KEY,
        );
    }

    // Private method to create an Alchemy instance for each network
    private createAlchemyInstances(apiKey: string): Record<Network, Alchemy> {
        const instances: Record<Network, Alchemy> = {} as Record<
            Network,
            Alchemy
        >;
        for (const network of this.EVMNetworksToCheck) {
            instances[network] = new Alchemy({
                apiKey,
                network,
            });
        }
        return instances;
    }

    // Checks if the provided address corresponds to an EVM smart contract.
    public async isEVMSmartContract(address: string): Promise<boolean> {
        const checks = this.EVMNetworksToCheck.map(async (network) => {
            try {
                const code =
                    await this.alchemyInstances[network].core.getCode(address);
                return code !== '0x' && code.length > 2;
            } catch (error) {
                this.logger.warn(
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
