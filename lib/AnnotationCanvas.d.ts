export default class AnnotationCanvas {
    private canvas;
    private ctx;
    private painting;
    constructor();
    private readonly resizeCanvas;
    private lastPosition;
    start: (p: [number, number]) => void;
    stop: () => void;
    move: (p: [number, number]) => void;
    clrTmID: ReturnType<typeof setTimeout> | null;
    private fadeOut;
    mount(): void;
    remove(): void;
}
