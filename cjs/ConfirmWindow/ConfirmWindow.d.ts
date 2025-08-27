import type { Properties } from 'csstype';
export type ButtonOptions = HTMLButtonElement | string | {
    innerHTML: string;
    style?: Properties;
};
export interface ConfirmWindowOptions {
    text: string;
    style?: Properties;
    confirmBtn: ButtonOptions;
    declineBtn: ButtonOptions;
}
export default class ConfirmWindow {
    private readonly wrapper;
    constructor(options: ConfirmWindowOptions);
    private resolve;
    private reject;
    mount(): Promise<boolean>;
    private _remove;
    remove(): void;
}
