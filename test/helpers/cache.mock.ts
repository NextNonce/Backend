export const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    getCacheKey: jest
        .fn()
        .mockImplementation(
            (domain: string, data: string | Record<string, string>) => {
                return `mocked:${mockCacheService.toKebabCase(domain)}:${typeof data === 'string' ? data : Object.keys(data).join(',')}`;
            },
        ),
    toKebabCase(value: string): string {
        return value
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/\s+/g, '-')
            .toLowerCase();
    },
};
