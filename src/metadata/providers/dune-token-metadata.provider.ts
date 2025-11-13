import { TokenMetadataProvider } from '@/metadata/interfaces/token-metadata-provider.interface';
import { ExternalTokenMetadataDto } from '@/metadata/dto/external-token-metadata.dto';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import {
    Inject,
    InternalServerErrorException,
    OnModuleInit,
} from '@nestjs/common';
import { throwLogged } from '@/common/helpers/error.helper';
import { DUNE_CHAIN_MAPPER } from '@/chain/mappers/dune-chain.mapper';
import { ChainMapper } from '@/chain/interfaces/chain-mapper.interface';
import { RateLimiterService } from '@/rate-limit/rate-limiter.service';

/**
 * Represents the optional parameters for the fetchBalances function.
 */
interface DuneFetchBalanceOptions {
    /**
     * A comma-separated list of chain_ids or tags for blockchains to get balances for.
     * Examples: "1,8453,10" or "mainnet,testnet"
     */
    chain_ids?: string;

    /**
     * Specify `erc20` or `native` to get only those types of assets.
     */
    filters?: 'erc20' | 'native';

    /**
     * A comma-separated list of additional metadata fields to include.
     * Supported values: "logo", "url"
     */
    metadata?: string;

    /**
     * The pagination cursor from a previous response.
     */
    offset?: string;

    /**
     * Maximum number of balances to return in a single request.
     */
    limit?: number;
}

/**
 * Describes a single token balance for a wallet.
 * Based on the BalanceData schema.
 */
interface DuneResponseData {
    address: string;
    amount: string;
    chain: string;
    chain_id?: number;
    decimals?: number | null;
    low_liquidity?: boolean;
    name?: string | null;
    pool_size?: number | null;
    price_usd?: number | null;
    symbol?: string | null;
    token_metadata?: {
        logo?: string | null;
        url?: string | null;
    } | null;
    value_usd?: number | null;
}

/**
 * Describes an error related to a specific token on a chain.
 * Based on the BalanceErrorInformation schema.
 */
interface DuneBalanceErrorInformation {
    address: string;
    chain_id: number;
    description?: string;
}

/**
 * Contains error details for the overall balance request.
 * Based on the BalanceErrors schema.
 */
interface DuneBalanceErrors {
    error_message?: string | null;
    token_errors?: DuneBalanceErrorInformation[];
}

interface DuneBalancesResponse {
    wallet_address: string;
    balances: DuneResponseData[];
    errors?: DuneBalanceErrors | null;
    next_offset?: string;
    request_time?: string | null;
    response_time?: string | null;
}

const API_BASE_URL = 'https://api.sim.dune.com/v1/evm/balances';

/**
 * Fetches real-time token balances for a given wallet URI (address or ENS name).
 *
 * @param apiKey - Your API key for the service (sent in X-Sim-Api-Key header).
 * @param uri - The wallet address or ENS name to get balances for (e.g., "0xd8da6bf26964af9d7eed9e03e53415d37aa96045").
 * @param options - An optional object containing query parameters like limit, chain_ids, etc.
 * @param logger
 * @returns A Promise that resolves to the BalancesResponse object.
 * @throws An error if the network request fails or the API returns a non-200 status code.
 */
async function fetchBalances(
    apiKey: string,
    uri: string,
    options: DuneFetchBalanceOptions = {},
    logger: AppLoggerService,
): Promise<DuneBalancesResponse | undefined> {
    // Construct the URL and add query parameters
    const url = new URL(`${API_BASE_URL}/${uri}`);

    // Append optional query parameters to the URL
    Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
        }
    });

    const headers = new Headers({
        Accept: 'application/json',
        'X-Sim-Api-Key': apiKey,
    });

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: headers,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
            `API request failed with status ${response.status}: ${response.statusText}\n${errorBody}`,
        );
        return undefined;
    }

    // Parse the JSON response and cast it to our defined type
    return (await response.json()) as Promise<DuneBalancesResponse>;
}

export class DuneTokenMetadataProvider
    implements TokenMetadataProvider, OnModuleInit
{
    private readonly logger: AppLoggerService;
    private readonly DUNE_API_KEY: string;
    private readonly queueName = DuneTokenMetadataProvider.name;

    constructor(
        private readonly rateLimiterService: RateLimiterService,
        @Inject(DUNE_CHAIN_MAPPER)
        private readonly duneChainMapper: ChainMapper,
    ) {
        this.logger = new AppLoggerService(DuneTokenMetadataProvider.name);
        this.DUNE_API_KEY = process.env.DUNE_API_KEY!;
        if (!this.DUNE_API_KEY) {
            this.logger.error('Missing Dune API key');
            throwLogged(
                new InternalServerErrorException('Internal server error'),
            );
        }
    }

    async onModuleInit() {
        await this.rateLimiterService.registerRateLimitQueue({
            queueName: this.queueName,
            points: 5,
            duration: 1,
        });
    }

    async getByWalletAddress(
        walletAddress: string,
        chainNames: string[],
    ): Promise<ExternalTokenMetadataDto[] | undefined> {
        return this.rateLimiterService.execute(this.queueName, async () => {
            this.logger.debug(
                `Fetching token metadata for wallet: ${walletAddress} on chains: ${chainNames.join(', ')}`,
            );
            const duneChainIds = chainNames.map((name) =>
                this.duneChainMapper.toExternalChainId(name),
            );
            const options: DuneFetchBalanceOptions = {
                chain_ids: duneChainIds.join(','),
                metadata: 'logo,url',
                limit: 10000, // Big enough to cover most wallets
            };
            const rawBalanceData = await fetchBalances(
                this.DUNE_API_KEY,
                walletAddress,
                options,
                this.logger,
            );
            if (!rawBalanceData) {
                this.logger.error(
                    `Failed to fetch metadata of tokens for wallet ${walletAddress}`,
                );
                return undefined;
            }
            if (rawBalanceData.errors) {
                for (const error of rawBalanceData.errors.token_errors || []) {
                    if (error.description !== 'Failed to obtain balance')
                        this.logger.error(
                            `Error for token ${error.address} on chain ${error.chain_id}: ${error.description}`,
                        );
                }
            }
            if (rawBalanceData.balances && rawBalanceData.balances.length > 0) {
                return rawBalanceData.balances.map(
                    (response) =>
                        new ExternalTokenMetadataDto({
                            chainName: this.duneChainMapper.toChainName(
                                response.chain,
                            ),
                            address: response.address,
                            symbol: response.symbol || undefined,
                            name: response.name || undefined,
                            decimals: response.decimals || undefined,
                            logoUrl: response.token_metadata?.logo || undefined,
                        }),
                );
            } else {
                this.logger.warn(
                    `No token balances found for wallet ${walletAddress} on chains ${chainNames.join(', ')}`,
                );
                return [];
            }
        });
    }
}
