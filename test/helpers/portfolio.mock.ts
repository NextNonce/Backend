export const mockPortfolioService = {
    create: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue({}),
    findOneAndVerifyAccess: jest.fn().mockResolvedValue({}),
    delCachedAll: jest.fn().mockResolvedValue({}),
};
