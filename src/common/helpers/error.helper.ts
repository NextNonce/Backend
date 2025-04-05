export function throwLogged<T extends Error>(error: T): never {
    (error as any).alreadyLogged = true;
    throw error;
}
