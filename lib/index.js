import './_slim.js';
import Assist from './Assist.js';
export default function (opts) {
    return function (app, appOptions = {}) {
        var _a;
        // @ts-ignore
        if (app === null || !((_a = navigator === null || navigator === void 0 ? void 0 : navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia)) { // 93.04% browsers
            return;
        }
        if (!app.checkRequiredVersion || !app.checkRequiredVersion('8.0.0')) {
            console.warn('OpenReplay Assist: couldn\'t load. The minimum required version of @openreplay/tracker@8.0.0 is not met');
            return;
        }
        app.notify.log('OpenReplay Assist initializing.');
        const assist = new Assist(app, opts, appOptions.__DISABLE_SECURE_MODE);
        app.debug.log(assist);
        return assist;
    };
}
