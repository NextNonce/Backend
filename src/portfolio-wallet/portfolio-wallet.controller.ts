import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { PortfolioWalletService } from './portfolio-wallet.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/user/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { PortfolioIdentifierDto } from '@/portfolio/dto/portfolio-identifier.dto';
import { Auth } from '@/auth/decorators';
import { PortfolioWalletDto } from '@/portfolio-wallet/dto/portfolio-wallet.dto';
import { CreatePortfolioWalletDto } from '@/portfolio-wallet/dto/create-portfolio-wallet.dto';

@ApiTags('portfolios')
@Auth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('portfolios')
export class PortfolioWalletController {
    constructor(
        private readonly portfolioWalletService: PortfolioWalletService,
    ) {}

    @Get(':id/wallets')
    @ApiOkResponse({
        description: 'List of wallets in the portfolio',
        type: PortfolioWalletDto,
        isArray: true,
    })
    async findAll(
        @CurrentUser() user: User,
        @Param() portfolioIdentifierDto: PortfolioIdentifierDto,
    ): Promise<PortfolioWalletDto[]> {
        const records = await this.portfolioWalletService.findAll(
            portfolioIdentifierDto.id,
            user.id,
        );
        return records.map(({ portfolioWallet, wallet }) =>
            PortfolioWalletDto.fromModels(portfolioWallet, wallet),
        );
    }

    @Post(':id/wallets')
    @ApiOkResponse({
        description: 'Wallet created in the portfolio',
        type: PortfolioWalletDto,
    })
    async createWallet(
        @CurrentUser() user: User,
        @Param() portfolioIdentifierDto: PortfolioIdentifierDto,
        @Body() createPortfolioWalletDto: CreatePortfolioWalletDto,
    ): Promise<PortfolioWalletDto> {
        const { portfolioWallet, wallet } =
            await this.portfolioWalletService.addWallet(
                portfolioIdentifierDto.id,
                user.id,
                createPortfolioWalletDto,
            );
        return PortfolioWalletDto.fromModels(portfolioWallet, wallet);
    }
}
