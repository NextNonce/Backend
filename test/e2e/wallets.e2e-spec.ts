import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { setupAppWithRegistration } from '../setup/app';
import * as request from 'supertest';

jest.setTimeout(15000);

describe('Wallets Endpoints (e2e)', () => {
    let app: INestApplication<App>;
    let token: string;
    const validAddressOfSimpleEVMWallet =
        '0x0ac7231cc1994fd98f80db1c58efba712fb72f1a';
    const validAddressOfSmartEVMBaseWallet =
        '0x1e4eed8fd57DFBaaE060F894582eC0183c5D6e38';

    const anotherValidAddressOfSimpleEVMWallet = '0x4062b997279de7213731dbe00485722a26718892';

    beforeAll(async () => {
        ({ app, token } = await setupAppWithRegistration());
    });

    afterAll(async () => {

        await request(app.getHttpServer())
            .delete('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        await app.close();
    });

    it('should pass', async () => {
        expect(true).toBe(true);
    });

    it('GET /v1/wallets should return 200 OK', async () => {
        const res = await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfSimpleEVMWallet}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wallet = res.body;
        expect(wallet).toBeDefined();
        expect(wallet).toHaveProperty('address');
        expect(wallet).not.toHaveProperty('name');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.toLowerCase()).toBe(validAddressOfSimpleEVMWallet.toLowerCase());
        expect(wallet.walletType).toBe('SIMPLE');
        expect(wallet.chainType).toBe('EVM');
    });

    it('GET /v1/wallets should return 200 OK', async () => {
        const res = await request(app.getHttpServer())
            .get(`/v1/wallets/${anotherValidAddressOfSimpleEVMWallet}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wallet = res.body;
        expect(wallet).toBeDefined();
        expect(wallet).toHaveProperty('address');
        expect(wallet).not.toHaveProperty('name');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.toLowerCase()).toBe(anotherValidAddressOfSimpleEVMWallet.toLowerCase());
        expect(wallet.walletType).toBe('SIMPLE');
        expect(wallet.chainType).toBe('EVM');
    });
});
