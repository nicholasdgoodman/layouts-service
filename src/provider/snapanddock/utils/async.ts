export async function promiseMap<T, U>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: (x: T, i: number) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: (x: T) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: () => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(
    // clang-format off
    // tslint:disable-next-line:no-any
    arr: T[], asyncF: (...args: any[]) => any): Promise<U[]> {
    // clang-format on
    return Promise.all<U>(arr.map(asyncF));
}
