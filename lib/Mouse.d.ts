type XY = [number, number];
export default class Mouse {
    private readonly agentName?;
    private readonly mouse;
    private position;
    constructor(agentName?: string | undefined);
    mount(): void;
    move(pos: XY): void;
    getPosition(): XY;
    click(pos: XY): HTMLElement | null;
    private readonly pScrEl;
    private lastScrEl;
    private readonly resetLastScrEl;
    private readonly handleWScroll;
    scroll(delta: XY): void;
    remove(): void;
}
export {};
