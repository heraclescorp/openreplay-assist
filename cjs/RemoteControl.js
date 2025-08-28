"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RCStatus = void 0;
var RCStatus;
(function (RCStatus) {
    RCStatus[RCStatus["Disabled"] = 0] = "Disabled";
    RCStatus[RCStatus["Requesting"] = 1] = "Requesting";
    RCStatus[RCStatus["Enabled"] = 2] = "Enabled";
})(RCStatus || (exports.RCStatus = RCStatus = {}));
let setInputValue = function (value) { this.value = value; };
const nativeInputValueDescriptor = typeof window !== 'undefined' && Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
if (nativeInputValueDescriptor && nativeInputValueDescriptor.set) {
    setInputValue = nativeInputValueDescriptor.set;
}
class RemoteControl {
    constructor(options, onGrand, onRelease) {
        this.options = options;
        this.onGrand = onGrand;
        this.onRelease = onRelease;
        this.mouse = null;
        this.status = RCStatus.Disabled;
        this.agentID = null;
        this.confirm = null;
        this.requestControl = (id) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.releaseControl = (isDenied, keepId) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.grantControl = (id) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.resetMouse = () => {
            console.log('Remote control is disabled.');
            return;
        };
        this.scroll = (id, d) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.move = (id, xy) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.focused = null;
        this.click = (id, xy) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.focus = (id, el) => {
            console.log('Remote control is disabled.');
            return;
        };
        this.input = (id, value) => {
            console.log('Remote control is disabled.');
            return;
        };
    }
    reconnect(ids) {
        console.log('Remote control is disabled.');
        return;
    }
}
exports.default = RemoteControl;
