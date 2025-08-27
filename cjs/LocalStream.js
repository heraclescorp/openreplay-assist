"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RequestLocalStream;
function dummyTrack() {
    const canvas = document.createElement('canvas'); //, { width: 0, height: 0})
    canvas.width = canvas.height = 2; // Doesn't work when 1 (?!)
    const ctx = canvas.getContext('2d');
    ctx === null || ctx === void 0 ? void 0 : ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(function draw() {
        ctx === null || ctx === void 0 ? void 0 : ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
    });
    // Also works. Probably it should be done once connected.
    //setTimeout(() => { ctx?.fillRect(0,0, canvas.width, canvas.height) }, 4000)
    return canvas.captureStream(60).getTracks()[0];
}
function RequestLocalStream() {
    return navigator.mediaDevices.getUserMedia({ audio: true, })
        .then(aStream => {
        const aTrack = aStream.getAudioTracks()[0];
        if (!aTrack) {
            throw new Error('No audio tracks provided');
        }
        return new _LocalStream(aTrack);
    });
}
class _LocalStream {
    constructor(aTrack) {
        this.mediaRequested = false;
        this.onVideoTrackCb = null;
        this.vdTrack = dummyTrack();
        this.stream = new MediaStream([aTrack, this.vdTrack,]);
    }
    toggleVideo() {
        if (!this.mediaRequested) {
            return navigator.mediaDevices.getUserMedia({ video: true, })
                .then(vStream => {
                const vTrack = vStream.getVideoTracks()[0];
                if (!vTrack) {
                    throw new Error('No video track provided');
                }
                this.stream.addTrack(vTrack);
                this.stream.removeTrack(this.vdTrack);
                this.mediaRequested = true;
                if (this.onVideoTrackCb) {
                    this.onVideoTrackCb(vTrack);
                }
                return true;
            })
                .catch(e => {
                // TODO: log
                console.error(e);
                return false;
            });
        }
        let enabled = true;
        this.stream.getVideoTracks().forEach(track => {
            track.enabled = enabled = enabled && !track.enabled;
        });
        return Promise.resolve(enabled);
    }
    toggleAudio() {
        let enabled = true;
        this.stream.getAudioTracks().forEach(track => {
            track.enabled = enabled = enabled && !track.enabled;
        });
        return enabled;
    }
    onVideoTrack(cb) {
        this.onVideoTrackCb = cb;
    }
    stop() {
        this.stream.getTracks().forEach(t => t.stop());
    }
}
