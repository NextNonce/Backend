export const mockPortfolioWalletService = {
    findAll: jest.fn().mockResolvedValue([]),
    addWallet: jest.fn().mockResolvedValue([]),
    delCachedAll: jest.fn().mockResolvedValue([]),
}