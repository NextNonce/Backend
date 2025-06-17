const defaultDatabaseMethods = {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    findFirst: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
};

export const createMockDatabaseService = () => ({
    $transaction: jest.fn().mockResolvedValue({}),

    auth: { ...defaultDatabaseMethods },
    wallet: { ...defaultDatabaseMethods },
    user: { ...defaultDatabaseMethods },
    portfolio: { ...defaultDatabaseMethods },
    // ...other modules
});
