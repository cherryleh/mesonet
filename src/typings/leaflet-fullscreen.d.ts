import * as L from 'leaflet';

declare module 'leaflet' {
  namespace control {
    function fullscreen(options?: FullscreenOptions): Control;
  }

  interface MapOptions {
    fullscreenControl?: boolean;
    fullscreenControlOptions?: FullscreenOptions;
  }

  interface FullscreenOptions {
    position?: string;
    title?: string;
    titleCancel?: string;
    forceSeparateButton?: boolean;
    forcePseudoFullscreen?: boolean;
    fullscreenElement?: boolean;
  }
}
