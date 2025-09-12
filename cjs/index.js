"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
require("./_slim.js");
const Assist_js_1 = require("./Assist.js");
function default_1(opts) {
    return function (app) {
        var _a;
        // @ts-ignore
        if (app === null || !((_a = navigator === null || navigator === void 0 ? void 0 : navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia)) { // 93.04% browsers
            return;
        }
        if (!app.checkRequiredVersion || !app.checkRequiredVersion('8.0.0')) {
            console.warn('OpenReplay Assist: couldn\'t load. The minimum required version of @openreplay/tracker/cjs@8.0.0 is not met');
            return;
        }
        app.notify.log('OpenReplay Assist initializing.');
        const assist = new Assist_js_1.default(app, opts);
        app.debug.log(assist);
        return assist;
    };
}
