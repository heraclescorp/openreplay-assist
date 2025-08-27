declare global {
    interface HTMLCanvasElement {
        captureStream(frameRate?: number): MediaStream;
    }
}
export default function RequestLocalStream(): Promise<LocalStream>;
declare class _LocalStream {
    private mediaRequested;
    readonly stream: MediaStream;
    private readonly vdTrack;
    constructor(aTrack: MediaStreamTrack);
    toggleVideo(): Promise<boolean>;
    toggleAudio(): boolean;
    private onVideoTrackCb;
    onVideoTrack(cb: (t: MediaStreamTrack) => void): void;
    stop(): void;
}
export type LocalStream = InstanceType<typeof _LocalStream>;
export {};
