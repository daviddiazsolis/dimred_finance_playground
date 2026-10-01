declare module '*.js' {
  export function initEngine(data: unknown, init?: { m?: string; paso?: number }, lang?: string): { getState: () => { m: string; paso: number }; destroy: () => void }
}
