import * as request from 'supertest';
import { setupAppWithRegistration } from '../setup/app';
import { authProvider } from '../setup/auth';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

jest.setTimeout(15000);

describe('Users Endpoints (e2e)', () => {
    let app: INestApplication<App>;
    let token: string;
    let user: { email: string; password: string };

    beforeAll(async () => {
        ({ app, token, user } = await setupAppWithRegistration());
    });

    afterAll(async () => {
        await app.close();
        //console.log('Active handles:', (process as any)._getActiveHandles());
    });

    it('POST /v1/users should register a user', () => {
        expect(token).toBeDefined();
    });

    it('GET /v1/users/me without token should return 401 Unauthorized', async () => {
        return (
            request(app.getHttpServer())
                .get('/v1/users/me')
                // Do not set Authorization header
                .expect(401)
        );
    });

    it('GET /v1/users/me with invalid token should return 401 Unauthorized', async () => {
        const invalidToken = 'Bearer invalid.token.value';
        return request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', invalidToken)
            .expect(401);
    });

    it('GET /v1/users/me should return user data', () => {
        return request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(user.email);
            });
    });

    it('POST /v1/users with invalid email format should return 400 Bad Request', async () => {
        const invalidEmailPayload = { email: 'invalid-email-format' };

        await request(app.getHttpServer())
            .post('/v1/users')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidEmailPayload)
            .expect(400);
    });

    it('GET /v1/users/ after AuthProvider login should return user data', async () => {
        const loginToken = await authProvider.loginTestUser(
            user.email,
            user.password,
        );
        expect(loginToken).toBeDefined();
        expect(loginToken).not.toEqual(token); // Ensure different tokens

        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${loginToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(user.email);
            });
        token = loginToken; // Update token for further tests
    });

    it('POST /v1/users should return 409 Conflict for duplicate email', async () => {
        const duplicateEmailPayload = { email: user.email };

        await request(app.getHttpServer())
            .post('/v1/users')
            .set('Authorization', `Bearer ${token}`)
            .send(duplicateEmailPayload)
            .expect(409);
    });

    it('PATCH /v1/users/me with invalid email format should return 400 Bad Request', async () => {
        const invalidEmailPayload = { email: 'invalid-email-format' };

        await request(app.getHttpServer())
            .patch('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidEmailPayload)
            .expect(400);
    });

    it('PATCH /v1/users/me should update user email after AuthProvider update', async () => {
        const newEmail = `updated_${Date.now()}@example.com`;

        const updatedEmail = await authProvider.updateTestUserEmail(
            token,
            newEmail,
        );
        expect(updatedEmail).toBe(newEmail);

        // Step 2: Sync with backend via PATCH
        await request(app.getHttpServer())
            .patch('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: newEmail })
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(newEmail);
            });

        // Verify the update
        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.email).toBe(newEmail);
            });

        user.email = newEmail;
    });

    it('DELETE /v1/users/me with invalid token should return 401 Unauthorized', async () => {
        await request(app.getHttpServer())
            .delete('/v1/users/me')
            .set('Authorization', 'Bearer invalid.token.value')
            .expect(401);
    });

    it('DELETE /v1/users/me should delete the user', async () => {
        await request(app.getHttpServer())
            .delete('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200); // Adjust status
    });

    it('GET /v1/users/me should return 404 Not Found after deletion', async () => {
        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(404);
    });

    it('POST /v1/users should return 404 Not Found after deletion', async () => {
        await request(app.getHttpServer())
            .post('/v1/users')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: user.email })
            .expect(404);
    });

    it('DELETE /v1/users/me should return 404 Not Found after deletion', async () => {
        await request(app.getHttpServer())
            .delete('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(404);
    });
});
