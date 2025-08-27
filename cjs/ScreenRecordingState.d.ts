import type { Options as ConfirmOptions } from './ConfirmWindow/defaults.js';
export declare enum RecordingState {
    Off = 0,
    Requested = 1,
    Recording = 2
}
export default class ScreenRecordingState {
    private readonly confirmOptions;
    private status;
    private recordingAgent;
    private overlayAdded;
    private uiComponents;
    constructor(confirmOptions: ConfirmOptions);
    get isActive(): boolean;
    private confirm;
    requestRecording: (id: string, onAccept: () => void, onDeny: () => void) => void;
    private readonly acceptRecording;
    readonly stopAgentRecording: (id: any) => void;
    readonly stopRecording: () => void;
    private readonly rejectRecording;
}
