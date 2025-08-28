import type { Options as AssistOptions } from './Assist';
export declare enum RCStatus {
    Disabled = 0,
    Requesting = 1,
    Enabled = 2
}
export default class RemoteControl {
    private readonly options;
    private readonly onGrand;
    private readonly onRelease;
    private mouse;
    status: RCStatus;
    private agentID;
    constructor(options: AssistOptions, onGrand: (id: string) => string | undefined, onRelease: (id?: string | null, isDenied?: boolean) => void);
    reconnect(ids: string[]): void;
    private confirm;
    requestControl: (id: string) => void;
    releaseControl: (isDenied?: boolean, keepId?: boolean) => void;
    grantControl: (id: string) => void;
    resetMouse: () => void;
    scroll: (id: any, d: any) => void;
    move: (id: any, xy: any) => void;
    private focused;
    click: (id: any, xy: any) => void;
    focus: (id: any, el: HTMLElement) => void;
    input: (id: any, value: string) => void;
}
