export interface ChainMapper {
    /**
     * Given the raw “chain” field from some external API,
     * return unique Chain.name (or throw if it doesn’t exist).
     */
    toChainName(externalChainName: string): string;

    /**
     * Given a unique Chain.name, return the external chain ID
     * used by the external API.
     */
    toExternalChainId(nnChainName: string): string;
}
