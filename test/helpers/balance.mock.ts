export const mockBalanceService = {
    getWalletBalances: jest.fn().mockResolvedValue({}),
    getPortfolioBalancesFromCache: jest.fn().mockResolvedValue({}),
};
