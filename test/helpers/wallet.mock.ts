
export const mockWalletService = {
    findOrCreate: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue({}),
    findByAddress: jest.fn().mockResolvedValue({}),
};

export const mockWalletTypeUtils = {
    getWalletType: jest.fn().mockReturnValue('mocked-wallet-type'),
}

export class mockAddressUtils {
    isStarknetAddress: jest.Mock = jest.fn().mockReturnValue(true);
    isEVMAddress: jest.Mock = jest.fn().mockReturnValue(true);
    getChainType: jest.Mock = jest.fn().mockReturnValue('0xMockedChecksumAddress');
    normalizeEVMAddress: jest.Mock = jest.fn().mockReturnValue('0xmockedlowercaseaddress');
    normalizeStarknetAddress: jest.Mock = jest.fn().mockReturnValue('0XMOCKEDUPPERCASEADDRESS');
    normalizeWalletAddress: jest.Mock = jest.fn().mockImplementation((address, chain) => {
        if (chain === 'EVM') {
            return this.normalizeEVMAddress(address);
        } else if (chain === 'CAIROVM') {
            return this.normalizeStarknetAddress(address);
        }
        throw new Error('Invalid chain type');
    });
}
