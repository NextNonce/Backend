export const mockWalletService = {
    findOrCreate: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue({}),
    findByAddress: jest.fn().mockResolvedValue({}),
};
