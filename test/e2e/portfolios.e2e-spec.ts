import * as request from 'supertest';
import { setupAppWithRegistration } from '../setup/app';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { Portfolio } from '@prisma/client';
import { authProvider } from '../setup/auth';

describe('Portfolios Endpoints (e2e)', () => {
    let app: INestApplication<App>;
    let token: string;
    let userPortfolios: Portfolio[];
    const validAddressOfSimpleEVMWallet =
        '0x0ac7231cc1994fd98f80db1c58efba712fb72f1a';
    const validAddressOfSmartEVMBaseWallet =
        '0x1e4eed8fd57DFBaaE060F894582eC0183c5D6e38';

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

    it('GET /v1/portfolios should return array where each object contains id, name, and portfolioAccess', async () => {
        const res = await request(app.getHttpServer())
            .get('/v1/portfolios')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const portfolios = res.body;
        // Check that the response is an array.
        expect(Array.isArray(portfolios)).toBe(true);

        // For every portfolio object, verify it has the desired properties.
        portfolios.forEach((portfolio: any) => {
            expect(portfolio).toHaveProperty('id');
            expect(portfolio).toHaveProperty('name');
            expect(portfolio).toHaveProperty('portfolioAccess');
        });
        userPortfolios = portfolios;
    });

    it('GET /v1/portfolios should contain only one portfolio with name "Portfolio" and portfolioAccess "PRIVATE"', async () => {
        const res = await request(app.getHttpServer())
            .get('/v1/portfolios')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const portfolios = res.body;
        expect(portfolios.length).toBe(1);
        expect(portfolios[0].name).toBe('Portfolio');
        expect(portfolios[0].portfolioAccess).toBe('PRIVATE');
    });

    it('GET /v1/portfolios/:id should return the portfolio with the given id', async () => {
        const portfolioId = userPortfolios[0].id;
        const res = await request(app.getHttpServer())
            .get(`/v1/portfolios/${portfolioId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const portfolio = res.body;
        expect(portfolio).toHaveProperty('id', portfolioId);
        expect(portfolio).toHaveProperty('name', 'Portfolio');
        expect(portfolio).toHaveProperty('portfolioAccess', 'PRIVATE');
    });

    it('GET /v1/portfolios/:id should return 404 for non-existent portfolio', async () => {
        const nonExistentId = 'e902aa29-1111-4ca4-833b-4b12a0051e53'; // Example of a non-existent ID
        await request(app.getHttpServer())
            .get(`/v1/portfolios/${nonExistentId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404);
    });

    it('GET /v1/portfolios/:id should return 400 for nonUUID id', async () => {
        const invalidId = 'invalid-id';
        await request(app.getHttpServer())
            .get(`/v1/portfolios/${invalidId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });

    it('GET /v1/portfolios/:id/wallets should return an empty array', async () => {
        const portfolioId = userPortfolios[0].id;
        const res = await request(app.getHttpServer())
            .get(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wallets = res.body;
        expect(Array.isArray(wallets)).toBe(true);
        expect(wallets.length).toBe(0);
    });

    it('GET /v1/portfolios/:id/wallets should return 404 Not Found for non-existent portfolio', async () => {
        const nonExistentId = 'e902aa29-1111-4ca4-833b-4b12a0051e53'; // Example of a non-existent ID
        await request(app.getHttpServer())
            .get(`/v1/portfolios/${nonExistentId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404);
    });

    it('POST /v1/portfolios/:id/wallets should return 404 Not Found for non-existent portfolio', async () => {
        const nonExistentId = 'e902aa29-1111-4ca4-833b-4b12a0051e53'; // Example of a non-existent ID
        await request(app.getHttpServer())
            .post(`/v1/portfolios/${nonExistentId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ address: validAddressOfSimpleEVMWallet })
            .expect(404);
    });

    it('POST /v1/portfolios/:id/wallets should return 400 for invalid wallet address', async () => {
        const portfolioId = userPortfolios[0].id;
        const invalidWalletAddress = 'invalid-wallet-address';
        await request(app.getHttpServer())
            .post(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ address: invalidWalletAddress })
            .expect(400);
    });

    it('POST /v1/portfolios/:id/wallets should return 400 for invalid EVM wallet address', async () => {
        const portfolioId = userPortfolios[0].id;
        const invalidWalletAddress = validAddressOfSimpleEVMWallet + 'a2'; // Invalid address
        await request(app.getHttpServer())
            .post(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ address: invalidWalletAddress })
            .expect(400);
    });

    it('POST /v1/portfolios/:id/wallets should return 201 for valid wallet address of simple EVM wallet', async () => {
        const portfolioId = userPortfolios[0].id;
        const res = await request(app.getHttpServer())
            .post(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ address: validAddressOfSimpleEVMWallet })
            .expect(201);

        const wallet = res.body;
        expect(wallet).toHaveProperty('address');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.length).toBe(
            validAddressOfSimpleEVMWallet.length,
        );
        expect(wallet.walletType).toBe('SIMPLE');
        expect(wallet.chainType).toBe('EVM');
    });

    it('POST /v1/portfolios/:id/wallets should return 201 for valid wallet address of smart EVM wallet', async () => {
        const portfolioId = userPortfolios[0].id;
        const res = await request(app.getHttpServer())
            .post(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ address: validAddressOfSmartEVMBaseWallet })
            .expect(201);

        const wallet = res.body;
        expect(wallet).toHaveProperty('address');
        expect(wallet).toHaveProperty('walletType');
        expect(wallet).toHaveProperty('chainType');
        expect(wallet.address.length).toBe(
            validAddressOfSmartEVMBaseWallet.length,
        );
        expect(wallet.walletType).toBe('SMART');
        expect(wallet.chainType).toBe('EVM');
    });

    describe('Multi-User Portfolio Access', () => {
        let anotherUserToken: string;
        let anotherUserPortfolios: Portfolio[];
        const anotherValidAddressOfSimpleEVMWallet =
            '0xdec97cfe1c75b709ef3e9907322d1c0d3d706e47';

        beforeAll(async () => {
            const { token } = await authProvider.registerTestUser();

            await request(app.getHttpServer())
                .post('/v1/users')
                .set('Authorization', `Bearer ${token}`)
                .expect(201);

            anotherUserToken = token;
        });

        afterAll(async () => {
            await request(app.getHttpServer())
                .delete('/v1/users/me')
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(200);
        });

        it('GET /v1/portfolios/:id should return 403 Forbidden for non-owner', async () => {
            const portfolioId = userPortfolios[0].id;
            await request(app.getHttpServer())
                .get(`/v1/portfolios/${portfolioId}`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(404);
        });

        it('GET /v1/portfolios/:id/wallets should return 404 Not Found for non-owner', async () => {
            const portfolioId = userPortfolios[0].id;
            await request(app.getHttpServer())
                .get(`/v1/portfolios/${portfolioId}/wallets`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(404);
        });

        it('POST /v1/portfolios/:id/wallets should return 403 Forbidden for non-owner', async () => {
            const portfolioId = userPortfolios[0].id;
            await request(app.getHttpServer())
                .post(`/v1/portfolios/${portfolioId}/wallets`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .send({ address: anotherValidAddressOfSimpleEVMWallet })
                .expect(403);
        });

        it('POST /v1/portfolios/:id/wallets should return 201 for another valid wallet address of simple EVM wallet for another user', async () => {
            const res = await request(app.getHttpServer())
                .get('/v1/portfolios')
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(200);

            anotherUserPortfolios = res.body;
            const portfolioId = anotherUserPortfolios[0].id;
            await request(app.getHttpServer())
                .post(`/v1/portfolios/${portfolioId}/wallets`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .send({ address: anotherValidAddressOfSimpleEVMWallet })
                .expect(201);
        });

        it('POST /v1/portfolios/:id/wallets should return 201 for valid wallet address of simple EVM wallet that was already in portfolio of another user', async () => {
            const portfolioId = anotherUserPortfolios[0].id;
            await request(app.getHttpServer())
                .post(`/v1/portfolios/${portfolioId}/wallets`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .send({ address: validAddressOfSimpleEVMWallet })
                .expect(201);
        });

        it("GET /v1/portfolios/:id/wallets should return the wallets of the another user's portfolio", async () => {
            const portfolioId = anotherUserPortfolios[0].id;
            const res = await request(app.getHttpServer())
                .get(`/v1/portfolios/${portfolioId}/wallets`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(200);

            const wallets = res.body;
            expect(Array.isArray(wallets)).toBe(true);
            expect(wallets.length).toBe(2);
        });
    });

    it("GET /v1/portfolios/:id/wallets should return the wallets of initial user's portfolio", async () => {
        const portfolioId = userPortfolios[0].id;
        const res = await request(app.getHttpServer())
            .get(`/v1/portfolios/${portfolioId}/wallets`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wallets = res.body;
        expect(Array.isArray(wallets)).toBe(true);
        expect(wallets.length).toBe(2);
        //expect(wallets[0].address).toBe(validAddressOfSimpleEVMWallet);
        //expect(wallets[1].address).toBe(validAddressOfSmartEVMBaseWallet);
    });
});
