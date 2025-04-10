export const mockAuthService = {
    getAuthUserByToken: jest.fn().mockResolvedValue({}),
    createRecord: jest.fn().mockResolvedValue({}),
    deleteRecord: jest.fn().mockResolvedValue({}),
    deleteAuthUser: jest.fn().mockResolvedValue({}),
};
