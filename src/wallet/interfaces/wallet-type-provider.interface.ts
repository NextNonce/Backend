export const WALLET_TYPE_PROVIDER = Symbol('WALLET_TYPE_PROVIDER');

export interface WalletTypeProvider {
    /**
     * Given a wallet address, determine if it is an EVM smart contract wallet.
     * @param walletAddress
     * @return Promise<boolean> - true if the wallet is an EVM smart contract, false otherwise.
     */
    isEVMSmartContract(walletAddress: string): Promise<boolean>;
}
