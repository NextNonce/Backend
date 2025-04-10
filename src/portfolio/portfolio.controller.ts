import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { Auth } from '@/auth/decorators';
import { CurrentUser } from '@/user/decorators/current-user.decorator';
import { Portfolio, User, Wallet } from '@prisma/client';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { PortfolioIdentifierDto } from '@/portfolio/dto/portfolio-identifier.dto';
import { PortfolioDto } from '@/portfolio/dto/portfolio.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { WalletIdentifierDto } from '@/wallet/dto/wallet-identifier.dto';
import { WalletDto } from '@/wallet/dto/wallet.dto';

@ApiTags('portfolios')
@Auth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('portfolios')
export class PortfolioController {
    private readonly logger: AppLoggerService;
    constructor(private readonly portfolioService: PortfolioService) {
        this.logger = new AppLoggerService(PortfolioController.name);
    }

    /*@Post()
    findOrCreate(@Body() createPortfolioDto: CreatePortfolioDto) {
    }*/ // For now user have only one portfolio that is pre-created when the user is created

    @Get()
    @ApiOkResponse({
        description: 'List of user portfolios',
        type: PortfolioDto,
        isArray: true,
    })
    async findAll(@CurrentUser() user: User): Promise<PortfolioDto[]> {
        const portfolios: Portfolio[] = await this.portfolioService.findAll(
            user.id,
        );
        return portfolios.map(
            (portfolio: Portfolio): PortfolioDto =>
                PortfolioDto.fromModel(portfolio),
        );
    }

    @Get(':id')
    @ApiOkResponse({
        description: 'Portfolio',
        type: PortfolioDto,
    })
    async findOne(
        @CurrentUser() user: User,
        @Param() portfolioIdentifierDto: PortfolioIdentifierDto,
    ): Promise<PortfolioDto> {
        const portfolio: Portfolio =
            await this.portfolioService.findOneAndVerifyAccess({
                id: portfolioIdentifierDto.id,
                userId: user.id,
                requireOwnership: false,
            });
        return PortfolioDto.fromModel(portfolio);
    }

    @Get(':id/wallets')
    @ApiOkResponse({
        description: 'List of wallets in the portfolio',
        type: WalletDto,
        isArray: true,
    })
    async findWallets(
        @CurrentUser() user: User,
        @Param() portfolioIdentifierDto: PortfolioIdentifierDto,
    ): Promise<WalletDto[]> {
        const wallets: Wallet[] = await this.portfolioService.findWallets(
            portfolioIdentifierDto.id,
            user.id,
        );
        return wallets.map(
            (wallet: Wallet): WalletDto => WalletDto.fromModel(wallet),
        );
    }

    @Post(':id/wallets')
    @ApiOkResponse({
        description: 'Wallet created',
        type: WalletDto,
    })
    async addWallet(
        @CurrentUser() user: User,
        @Param() portfolioIdentifierDto: PortfolioIdentifierDto,
        @Body() walletIdentifierDto: WalletIdentifierDto,
    ): Promise<WalletDto> {
        const wallet: Wallet = await this.portfolioService.addWallet(
            portfolioIdentifierDto.id,
            user.id,
            walletIdentifierDto.address,
        );
        return WalletDto.fromModel(wallet);
    }

    /*@Delete(':id')
    remove(@Param('id') id: string) {
    }*/ // For now user can't delete only portfolio
}
