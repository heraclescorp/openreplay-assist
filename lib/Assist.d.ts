import { App } from '@openreplay/tracker';
type StartEndCallback = () => ((() => any) | void);
export interface Options {
    onAgentConnect: StartEndCallback;
    onRecordingRequest?: () => any;
    onRecordingDeny?: () => any;
    recordingConfirm: any;
    serverURL: string;
}
export default class Assist {
    private readonly app;
    readonly version = "6.0.0";
    private socket;
    private assistDemandedRestart;
    private agents;
    private readonly options;
    constructor(app: App, options?: Partial<Options>);
    private emit;
    private get agentsConnected();
    private getHost;
    private getBasePrefixUrl;
    private onStart;
    private clean;
}
export {};
