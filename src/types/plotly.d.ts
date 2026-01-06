declare module 'plotly.js-dist-min' {
  export function toImage(
    graphDiv: HTMLElement | string,
    options: {
      format?: 'png' | 'jpeg' | 'webp' | 'svg';
      width?: number;
      height?: number;
      scale?: number;
    }
  ): Promise<string>;

  export * from 'plotly.js';
}
