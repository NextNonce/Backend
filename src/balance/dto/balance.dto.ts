import { Decimal } from '@prisma/client/runtime/library';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';
import { IsDecimal } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

abstract class AbstractBalanceDto {
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description: 'The total balance in quote currency (e.g., USD)',
        example: '1234.56',
    })
    @IsDecimal()
    @Transform(({ value }) => new Decimal(value), { toClassOnly: true })
    balanceQuote: Decimal;
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description: 'The change in balance in quote currency (e.g., USD)',
        example: '12.34',
        required: false,
        nullable: true,
    })
    @IsDecimal()
    @Transform(({ value }) => (value == null ? null : new Decimal(value)), {
        toClassOnly: true,
    })
    balanceQuoteChange: Decimal | null;
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description:
            'The percentage change in balance in quote currency (e.g., USD)',
        example: '1.23',
        required: false,
        nullable: true,
    })
    @IsDecimal()
    @Transform(({ value }) => (value == null ? null : new Decimal(value)), {
        toClassOnly: true,
    })
    balanceQuoteChangePercent: Decimal | null;

    protected constructor(
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        this.balanceQuote = balanceQuote;
        this.balanceQuoteChange = balanceQuoteChange;
        this.balanceQuoteChangePercent =
            balanceQuoteChangePercent ??
            (balanceQuoteChange !== null
                ? calculateChangePercent(balanceQuote, balanceQuoteChange)
                : null);
    }
}

export class BalanceDto extends AbstractBalanceDto {
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description:
            'The total balance of token (e.g., ETH, USDC, LINK, etc.) in native units',
        example: '1.2345',
    })
    @IsDecimal()
    @Transform(({ value }) => (value == null ? null : new Decimal(value)), {
        toClassOnly: true,
    })
    balanceNative: Decimal;

    constructor(
        balanceNative: Decimal,
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        super(balanceQuote, balanceQuoteChange, balanceQuoteChangePercent);
        this.balanceNative = balanceNative;
    }
}

export class TotalBalanceDto extends AbstractBalanceDto {
    constructor(
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        super(balanceQuote, balanceQuoteChange, balanceQuoteChangePercent);
    }
}
