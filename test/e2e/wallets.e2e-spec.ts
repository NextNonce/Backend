import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { setupAppWithRegistration } from '../setup/app';
import * as request from 'supertest';

jest.setTimeout(15000);

describe('Wallets Endpoints (e2e)', () => {
    let app: INestApplication<App>;
    let token: string;
    const validAddressOfSimpleEVMWallet = '0x0ac7231cc1994fd98f80db1c58efba712fb72f1a';
    const validAddressOfSmartEVMBaseWallet = '0x1e4eed8fd57DFBaaE060F894582eC0183c5D6e38';
    const anotherValidAddressOfSimpleEVMWallet = '0x4062b997279de7213731dbe00485722a26718892';
    const validAddressOfSimpleEVMWalletWithFailedChecksum = '0x0ac7231CC1994FD98F80db1c58efba712fb72f1a';
    const validAddressOfCairoVMWallet = '0x05a59647d82c61fa6c27cd2224d1e7dd96f74292dd54d969a4a82742bfe36a88';


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

    it('GET /v1/wallets should return 200 OK for valid address of simple EVM wallet with a name', async () => {
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

    it('GET /v1/wallets should return 200 OK for valid address of simple EVM wallet without a name', async () => {
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
        expect(wallet.address).not.toBe(anotherValidAddressOfSimpleEVMWallet.toLowerCase());
        expect(wallet.walletType).toBe('SIMPLE');
        expect(wallet.chainType).toBe('EVM');
    });

    it('GET /v1/wallets should return 200 OK for valid address of smart EVM base wallet', async () => {
        const res = await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfSmartEVMBaseWallet}`)
            .set('Authorization', `Bearer ${token}`)
            //.expect(200)
            .catch(err => {
                console.error('Error response:', err.response.body);
                throw err;
            });

        const wallet = res.body;
        expect(wallet).toBeDefined();
        expect(wallet).toHaveProperty('address');
        expect(wallet).not.toHaveProperty('name');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.toLowerCase()).toBe(validAddressOfSmartEVMBaseWallet.toLowerCase());
        expect(wallet.walletType).toBe('SMART');
        expect(wallet.chainType).toBe('EVM');
    });

    it('GET /v1/wallets should return 400 Bad Request for invalid address of EVM wallet', async () => {
        await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfSimpleEVMWallet + '123'}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });

    it('GET /v1/wallets should return 200 OK for valid address of EVM wallet with failed checksum', async () => {
        await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfSimpleEVMWalletWithFailedChecksum}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
    });

    it('GET /v1/wallets should return 200 OK for valid address of Starknet wallet', async () => {
        const res = await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfCairoVMWallet}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wallet = res.body;
        expect(wallet).toBeDefined();
        expect(wallet).toHaveProperty('address');
        expect(wallet).not.toHaveProperty('name');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.toLowerCase()).toBe(validAddressOfCairoVMWallet.toLowerCase());
        expect(wallet.address).not.toBe(validAddressOfCairoVMWallet.toLowerCase());
        expect(wallet.walletType).toBe('SMART');
        expect(wallet.chainType).toBe('CAIROVM');
    });

    it('GET /v1/wallets should return 400 Bad Request for invalid address of Starknet wallet', async () => {
        await request(app.getHttpServer())
            .get(`/v1/wallets/${validAddressOfCairoVMWallet + '123'}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });
});
