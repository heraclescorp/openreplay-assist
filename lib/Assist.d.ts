import { App } from '@openreplay/tracker';
type StartEndCallback = (agentInfo?: Record<string, any>) => ((() => any) | void);
export interface Options {
    onAgentConnect: StartEndCallback;
    onRecordingRequest?: (agentInfo: Record<string, any>) => any;
    onRecordingDeny?: (agentInfo: Record<string, any>) => any;
    recordingConfirm: any;
    serverURL: string;
}
export default class Assist {
    private readonly app;
    private readonly noSecureMode;
    readonly version = "6.0.0";
    private socket;
    private assistDemandedRestart;
    private agents;
    private readonly options;
    constructor(app: App, options?: Partial<Options>, noSecureMode?: boolean);
    private emit;
    private get agentsConnected();
    private getHost;
    private getBasePrefixUrl;
    private onStart;
    private clean;
}
export {};
