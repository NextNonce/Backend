import { Injectable } from '@nestjs/common';

@Injectable()
export class BalanceService {
    findAll() {
        return `This action returns all balance`;
    }

    findOne(id: number) {
        return `This action returns a #${id} balance`;
    }

    remove(id: number) {
        return `This action removes a #${id} balance`;
    }
}
