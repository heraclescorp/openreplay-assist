import type { Properties } from 'csstype';
import { App } from '@openreplay/tracker';
import type { Options as ConfirmOptions } from './ConfirmWindow/defaults.js';
type StartEndCallback = (agentInfo?: Record<string, any>) => ((() => any) | void);
export interface Options {
    onAgentConnect: StartEndCallback;
    onCallStart: StartEndCallback;
    onRemoteControlStart: StartEndCallback;
    onRecordingRequest?: (agentInfo: Record<string, any>) => any;
    onCallDeny?: () => any;
    onRemoteControlDeny?: (agentInfo: Record<string, any>) => any;
    onRecordingDeny?: (agentInfo: Record<string, any>) => any;
    session_calling_peer_key: string;
    session_control_peer_key: string;
    callConfirm: ConfirmOptions;
    controlConfirm: ConfirmOptions;
    recordingConfirm: ConfirmOptions;
    confirmText?: string;
    confirmStyle?: Properties;
    config: RTCConfiguration;
    serverURL: string;
    callUITemplate?: string;
}
export default class Assist {
    private readonly app;
    private readonly noSecureMode;
    readonly version = "6.0.0";
    private socket;
    private peer;
    private assistDemandedRestart;
    private callingState;
    private remoteControl;
    private agents;
    private readonly options;
    constructor(app: App, options?: Partial<Options>, noSecureMode?: boolean);
    private emit;
    private get agentsConnected();
    private readonly setCallingState;
    private getHost;
    private getBasePrefixUrl;
    private onStart;
    private playNotificationSound;
    private clean;
}
export {};
