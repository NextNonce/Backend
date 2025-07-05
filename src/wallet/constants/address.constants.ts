export const EVM_ADDRESS_LENGTH = 42; // 0x-prefixed 20-byte address
export const STARKNET_ADDRESS_LENGTH = 66; // 0x-prefixed 32-byte felt

export const ADDRESS_LENGTHS = {
    EVM: EVM_ADDRESS_LENGTH,
    STARKNET: STARKNET_ADDRESS_LENGTH,
};

export const ADDRESS_MIN_LENGTH = Math.min(
    EVM_ADDRESS_LENGTH,
    STARKNET_ADDRESS_LENGTH,
);
export const ADDRESS_MAX_LENGTH = Math.max(
    EVM_ADDRESS_LENGTH,
    STARKNET_ADDRESS_LENGTH,
);
