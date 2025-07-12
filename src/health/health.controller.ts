import { Controller, Get } from '@nestjs/common';
import { SkipUserLookup } from '@/user/decorators/skip-user-lookup.decorator';
import { Public } from '@/common/decorators/public.decorator';

@Controller('health')
export class HealthController {
    @Public()
    @Get()
    @SkipUserLookup()
    ok() {
        return { status: 'ok' };
    }
}
