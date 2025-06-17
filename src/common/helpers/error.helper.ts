export function throwLogged<T extends Error>(error: T): never {
    (error as { alreadyLogged?: boolean }).alreadyLogged = true;
    throw error;
}
