import { Decimal } from '@prisma/client/runtime/library';
import { ApiProperty } from '@nestjs/swagger';

export class TokenPriceDto {
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description: 'The price of the token in quotes (e.g., USD)',
        example: '123.456',
    })
    priceQuote: Decimal;
    @ApiProperty({
        type: 'string',
        format: 'decimal',
        description: 'The change in price, if available, in quotes (e.g., USD)',
        example: '1.23',
        required: false,
        nullable: true,
    })
    change: Decimal | null;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
        description: 'The timestamp when the price was last updated',
        example: '2024-12-01T12:00:00Z',
    })
    timestamp: Date;

    constructor(
        priceQuote: Decimal,
        timestamp: Date,
        change: Decimal | null = null,
    ) {
        this.priceQuote = priceQuote;
        this.change = change;
        this.timestamp = timestamp;
    }
}
