export const mockPortfolioService = {
    create: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue({}),
    findOneAndVerifyAccess: jest.fn().mockResolvedValue({}),
    findWallets: jest.fn().mockResolvedValue([]),
    addWallet: jest.fn().mockResolvedValue([]),
    removeAll: jest.fn().mockResolvedValue([]),
};
