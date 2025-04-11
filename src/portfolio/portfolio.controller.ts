import {
    Controller,
    Get,
    Param,
    //Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { Auth } from '@/auth/decorators';
import { CurrentUser } from '@/user/decorators/current-user.decorator';
import { Portfolio, User } from '@prisma/client';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { PortfolioIdentifierDto } from '@/portfolio/dto/portfolio-identifier.dto';
import { PortfolioDto } from '@/portfolio/dto/portfolio.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

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

    /*@Delete(':id')
    remove(@Param('id') id: string) {
    }*/ // For now user can't delete only portfolio
}
