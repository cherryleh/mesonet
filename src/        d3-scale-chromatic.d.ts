declare module "d3-scale-chromatic" {
    export function interpolateViridis(value: number): string;
    export const interpolatePlasma: (t: number) => string;
    export const interpolateTurbo: (t: number) => string;
    export const interpolateRdBu: (t: number) => string;
  }
  