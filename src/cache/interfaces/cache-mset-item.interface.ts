export interface CacheMSetItem<T> {
    key: string;
    value: T;
    ttlInSeconds?: number;
}
