import type { ConfirmWindowOptions } from './ConfirmWindow.js';
export type Options = string | Partial<ConfirmWindowOptions>;
export declare const callConfirmDefault: (opts: Options) => ConfirmWindowOptions;
export declare const controlConfirmDefault: (opts: Options) => ConfirmWindowOptions;
export declare const recordRequestDefault: (opts: Options) => ConfirmWindowOptions;
