import { AppLoggerService } from '@/app-logger/app-logger.service';
import {
    Inject,
    InternalServerErrorException,
    OnModuleInit,
} from '@nestjs/common';
import { throwLogged } from '@/common/helpers/error.helper';
import axios, { AxiosRequestConfig, Method } from 'axios';
import * as crypto from 'crypto';
import { BalanceProvider } from '@/balance/interfaces/balance-provider.interface';

import { ExternalTokenBalanceDto } from '@/balance/dto/external-token-balance.dto';
import { OKX_DEX_CHAIN_MAPPER } from '@/chain/mappers/okx-dex-chain.mapper';
import { ChainMapper } from '@/chain/interfaces/chain-mapper.interface';
import { Decimal } from '@prisma/client/runtime/library';
import { RateLimiterService } from '@/rate-limit/rate-limiter.service';
import { RateLimiterStoreAbstract } from 'rate-limiter-flexible';

/**
 * Represents the credentials required for API authentication.
 */
interface OkxApiCredentials {
    apiKey: string;
    secretKey: string;
    passphrase: string;
}

/**
 * Represents a single token asset in the balance list.
 */
interface OkxTokenAsset {
    chainIndex: string;
    tokenContractAddress: string;
    symbol: string;
    balance: string;
    tokenPrice: string;
    isRiskToken: boolean;
    rawBalance: string;
    address: string;
}

/**
 * Represents the data structure for a list of token assets on a specific chain.
 */
interface OkxChainTokenAssetsResponse {
    tokenAssets: OkxTokenAsset[];
}

/**
 * Represents the overall API response structure for the token balances endpoint.
 */
interface OkxTotalTokenBalancesResponse {
    code: string;
    msg: string;
    data: OkxChainTokenAssetsResponse[];
}

export class OkxDexBalanceProvider implements BalanceProvider, OnModuleInit {
    private readonly logger: AppLoggerService;
    private readonly baseUrl = 'https://web3.okx.com';
    private apiCredentials: OkxApiCredentials;
    private limiter: RateLimiterStoreAbstract;

    constructor(
        private readonly rateLimiterService: RateLimiterService,
        @Inject(OKX_DEX_CHAIN_MAPPER)
        private readonly okxDexChainMapper: ChainMapper,
    ) {
        this.logger = new AppLoggerService(OkxDexBalanceProvider.name);
        this.apiCredentials = {
            apiKey: process.env.OKX_DEV_API_KEY || '',
            secretKey: process.env.OKX_DEV_SECRET_KEY || '',
            passphrase: process.env.OKX_DEV_PASSPHRASE || '',
        };
        if (
            !this.apiCredentials.apiKey ||
            !this.apiCredentials.secretKey ||
            !this.apiCredentials.passphrase
        ) {
            this.logger.error(
                'OKX API credentials are not set in environment variables.',
            );
            throwLogged(
                new InternalServerErrorException('Internal server error'),
            );
        }
    }

    async onModuleInit() {
        this.limiter = await this.rateLimiterService.createLimiter({
            keyPrefix: OkxDexBalanceProvider.name, // A unique prefix for this limiter
            points: 1, // e.g., 5 requests
            duration: 1.5, // per 1 second
        });
    }

    getTokenBalances(
        address: string,
        chainNames: string[],
    ): Promise<ExternalTokenBalanceDto[]> | undefined {
        if (!address || !chainNames || chainNames.length === 0) {
            this.logger.error('Address or chain names are not provided.');
            return undefined;
        }
        this.logger.debug(`Fetching token balances for address: ${address}`);
        const chainIds = chainNames.map((chainName) =>
            this.okxDexChainMapper.toExternalChainId(chainName),
        );
        return this.getChainTokenAssetsResponses(address, chainIds)
            .then((responses) => {
                if (!responses || responses.length === 0) {
                    return [];
                }
                const balances: ExternalTokenBalanceDto[] = [];
                responses.forEach((response) => {
                    response.tokenAssets.forEach((asset) => {
                        const balance = new Decimal(asset.balance);
                        const priceUsd = asset.tokenPrice
                            ? new Decimal(asset.tokenPrice)
                            : new Decimal(0);
                        if (balance.isZero() || priceUsd.isZero()) {
                            return; // Skip assets with zero balance or price
                        }
                        const balanceUsd = balance.mul(priceUsd);
                        balances.push(
                            new ExternalTokenBalanceDto({
                                chainName: this.okxDexChainMapper.toChainName(
                                    asset.chainIndex,
                                ),
                                address:
                                    asset.tokenContractAddress.length === 0
                                        ? 'native'
                                        : asset.tokenContractAddress,
                                balance: balance,
                                priceUsd: priceUsd,
                                balanceUsd: balanceUsd,
                            }),
                        );
                    });
                });
                return balances;
            })
            .catch((error) => {
                const requestError = error as Error;
                this.logger.error(
                    `Error fetching token balances for address ${address}: ${requestError.message}`,
                );
                throwLogged(new InternalServerErrorException(requestError));
            });
    }

    public async getChainTokenAssetsResponses(
        address: string,
        chainIndexes: string[],
    ): Promise<OkxChainTokenAssetsResponse[] | undefined> {
        const requestPath = '/api/v6/dex/balance/all-token-balances-by-address';

        // The API expects 'chains' as a comma-separated string in the query.
        const queryParams = {
            address,
            chains: chainIndexes.join(','),
            excludeRiskToken: '0', // '0' means exclude risk tokens, '1' means include them
        };

        const maxRetries = 3;
        const retryDelayMs = 1000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response =
                    await this.request<OkxTotalTokenBalancesResponse>(
                        'GET',
                        requestPath,
                        queryParams,
                    );
                if (response && response.code === '0') {
                    if (response.data && response.data.length > 0)
                        return response.data;
                    this.logger.warn(
                        `No token assets found for address ${address}}`,
                    );
                }
                this.logger.warn(
                    `[Attempt ${attempt}/${maxRetries}] API returned non-zero code or was malformed. ` +
                    `Code: ${response?.code ?? 'undefined'}, ` + // Use optional chaining
                    `Msg: ${response?.msg ?? 'undefined'}. Retrying...`,
                );
            } catch (error) {
                const requestError = error as Error;
                this.logger.warn(
                    `[Attempt ${attempt}/${maxRetries}] Request failed for address ${address}: ${requestError.message}. Retrying...`,
                );
            }
            if (attempt < maxRetries) {
                await new Promise((resolve) =>
                    setTimeout(resolve, retryDelayMs),
                );
            }
        }
        this.logger.error(
            `Failed to fetch token balances for address ${address} after ${maxRetries} attempts.`,
        );
        return undefined;
    }

    /**
     * Generates the required authentication headers for an API request.
     * @param method - The HTTP method (e.g., 'GET', 'POST').
     * @param requestPath - The API endpoint path (e.g., '/v6/wallet/asset/all-token-balances-by-address').
     * @param body - The request body for POST requests, or query string for GET requests.
     * @returns The headers object for the request.
     */
    private createAuthHeaders(
        method: Method,
        requestPath: string,
        body: string = '',
    ): Record<string, string> {
        const timestamp = new Date().toISOString();

        // Step 1: Concatenate the components to form the pre-hash string.
        const prehash = timestamp + method.toUpperCase() + requestPath + body;

        // Step 2 & 3: Sign using HMAC SHA256 and encode in Base64.
        const signature = crypto
            .createHmac('sha256', this.apiCredentials.secretKey)
            .update(prehash)
            .digest('base64');

        return {
            'OK-ACCESS-KEY': this.apiCredentials.apiKey,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': this.apiCredentials.passphrase,
            'OK-ACCESS-SIGN': signature,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Sends a request to the OKX API.
     * @param method - The HTTP method.
     * @param requestPath - The API endpoint path.
     * @param params - The query parameters for GET requests or body for POST requests.
     * @returns A promise that resolves with the API response data.
     */
    private async request<T>(
        method: Method,
        requestPath: string,
        params: Record<string, any> = {},
    ): Promise<T> {
        await this.rateLimiterService.waitForGoAhead(
            this.limiter,
            `${OkxDexBalanceProvider.name}:request`,
        );

        let fullPath = requestPath;
        let bodyForSignature = '';
        const config: AxiosRequestConfig = {
            method,
            baseURL: this.baseUrl,
            url: fullPath,
        };

        if (method.toUpperCase() === 'GET') {
            // For GET requests, parameters are added to the query string.
            const queryString = new URLSearchParams(params).toString();
            if (queryString) {
                fullPath += `?${queryString}`;
                config.url = fullPath;
            }
            // The body part of the signature string is the full query string, including the '?'.
            // If there are no params, it's an empty string.
            bodyForSignature = queryString ? `?${queryString}` : '';
        } else if (method.toUpperCase() === 'POST') {
            // For POST requests, the body is a JSON string.
            if (Object.keys(params).length > 0) {
                const jsonBody = JSON.stringify(params);
                config.data = jsonBody;
                bodyForSignature = jsonBody;
            }
        }

        // Generate authentication headers
        config.headers = this.createAuthHeaders(
            method,
            requestPath,
            bodyForSignature,
        );

        try {
            const response = await axios(config);
            return response.data as T;
        } catch (error) {
            const responseError = error as Error;
            if (axios.isAxiosError(responseError) && responseError.response) {
                this.logger.error(
                    `API request failed with status ${responseError.response.status}: ${JSON.stringify(responseError.response.data)}`,
                );
            } else {
                this.logger.error(
                    `An unexpected error occurred during the API request: ${responseError}`,
                );
            }
            throwLogged(new InternalServerErrorException(responseError));
        }
    }
}
