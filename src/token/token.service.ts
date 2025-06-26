import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { DatabaseService } from '@/database/database.service';
import { UnifiedTokenWithDetails } from '@/token/types/unified-token.types';
import { TokenIdentifier } from '@/token/types/token.types';
import { ChainService } from '@/chain/chain.service';
import { getKeyFromTokenIdentifier } from '@/token/utils/token.utils';

@Injectable()
export class TokenService implements OnModuleInit {
    private readonly logger: AppLoggerService;
    private unifiedTokensWithDetails: UnifiedTokenWithDetails[];
    private unifiedTokensWithDetailsMap: Map<string, UnifiedTokenWithDetails>;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly chainService: ChainService,
    ) {
        this.logger = new AppLoggerService(TokenService.name);
        this.unifiedTokensWithDetails = [];
        this.unifiedTokensWithDetailsMap = new Map<
            string,
            UnifiedTokenWithDetails
        >();
    }

    async onModuleInit(): Promise<void> {
        this.logger.log(`Fetching all unified tokens from the database...`);
        try {
            this.unifiedTokensWithDetails =
                await this.databaseService.unifiedToken.findMany({
                    include: {
                        tokens: true,
                        tokenMetadata: true,
                    },
                });
            this.logger.log(
                `Found ${this.unifiedTokensWithDetails.length} unified tokens in the database.`,
            );
            this.unifiedTokensWithDetails.map((unifiedToken) => {
                unifiedToken.tokens.forEach((token) => {
                    const tokenIdentifier: TokenIdentifier = {
                        chainName: this.chainService.getChainById(token.chainId)
                            .name,
                        address: token.address,
                    };
                    const key = getKeyFromTokenIdentifier(tokenIdentifier);
                    this.unifiedTokensWithDetailsMap.set(key, unifiedToken);
                });
            });
        } catch (error) {
            const initError = error as Error;
            this.logger.error(
                `Error fetching unified tokens from the database: ${initError.message}`,
            );
            throw initError;
        }
    }

    getUnifiedTokenByTokenIdentifier(
        ti: TokenIdentifier,
    ): UnifiedTokenWithDetails | undefined {
        return this.unifiedTokensWithDetailsMap.get(
            getKeyFromTokenIdentifier(ti),
        );
    }
}
