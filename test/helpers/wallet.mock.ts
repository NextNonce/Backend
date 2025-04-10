export const mockWalletService = {
    create: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue({}),
    findByAddress: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
};
