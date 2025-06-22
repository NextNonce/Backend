import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { DatabaseService } from '@/database/database.service';
import { Chain } from '@prisma/client';
import { throwLogged } from '@/common/helpers/error.helper';

@Injectable()
export class ChainService implements OnModuleInit {
    private readonly logger: AppLoggerService;
    private chains: Chain[];
    private chainsMap: Record<string, Chain>;

    constructor(private readonly databaseService: DatabaseService) {
        this.logger = new AppLoggerService(ChainService.name);
        this.chains = [];
        this.chainsMap = {};
    }

    async onModuleInit(): Promise<void> {
        this.logger.log(`Fetching all chains from the database...`);
        try {
            this.chains = await this.databaseService.chain.findMany();
            this.logger.log(
                `Found ${this.chains.length} chains in the database.`,
            );
            this.chains.map((chain) => {
                this.chainsMap[chain.id] = chain;
                this.chainsMap[chain.name] = chain;
            });
        } catch (error) {
            const initError = error as Error;
            this.logger.error(
                `Error fetching chains from the database: ${initError.message}`,
            );
            throwLogged(initError);
        }
    }

    getChainById(id: string): Chain {
        const chain = this.chainsMap[id];
        if (!chain) {
            this.logger.error(`Chain with ID ${id} not found.`);
            throwLogged(new Error(`Chain with ID ${id} not found.`));
        }
        return chain;
    }

    getChainByName(name: string): Chain {
        const chain = this.chainsMap[name];
        if (!chain) {
            this.logger.error(`Chain with name ${name} not found.`);
            throwLogged(new Error(`Chain with name ${name} not found.`));
        }
        return chain;
    }

    getAllChains(): Chain[] {
        return this.chains;
    }
}
