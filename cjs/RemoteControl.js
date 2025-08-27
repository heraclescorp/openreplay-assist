"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RCStatus = void 0;
const Mouse_js_1 = require("./Mouse.js");
const ConfirmWindow_js_1 = require("./ConfirmWindow/ConfirmWindow.js");
const defaults_js_1 = require("./ConfirmWindow/defaults.js");
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
            if (this.agentID !== null) {
                this.releaseControl();
                return;
            }
            setTimeout(() => {
                if (this.status === RCStatus.Requesting) {
                    this.releaseControl();
                }
            }, 30000);
            this.agentID = id;
            this.status = RCStatus.Requesting;
            this.confirm = new ConfirmWindow_js_1.default((0, defaults_js_1.controlConfirmDefault)(this.options.controlConfirm));
            this.confirm.mount().then(allowed => {
                var _a;
                if (allowed) {
                    this.grantControl(id);
                }
                else {
                    (_a = this.confirm) === null || _a === void 0 ? void 0 : _a.remove();
                    this.releaseControl(true);
                }
            })
                .then(() => {
                var _a;
                (_a = this.confirm) === null || _a === void 0 ? void 0 : _a.remove();
            })
                .catch(e => {
                var _a;
                (_a = this.confirm) === null || _a === void 0 ? void 0 : _a.remove();
                console.error(e);
            });
        };
        this.releaseControl = (isDenied, keepId) => {
            if (this.confirm) {
                this.confirm.remove();
                this.confirm = null;
            }
            this.resetMouse();
            this.status = RCStatus.Disabled;
            if (!keepId) {
                sessionStorage.removeItem(this.options.session_control_peer_key);
            }
            this.onRelease(this.agentID, isDenied);
            this.agentID = null;
        };
        this.grantControl = (id) => {
            this.agentID = id;
            this.status = RCStatus.Enabled;
            sessionStorage.setItem(this.options.session_control_peer_key, id);
            const agentName = this.onGrand(id);
            if (this.mouse) {
                this.resetMouse();
            }
            this.mouse = new Mouse_js_1.default(agentName);
            this.mouse.mount();
            document.addEventListener('visibilitychange', () => {
                if (document.hidden)
                    this.releaseControl(false, true);
                else {
                    if (this.status === RCStatus.Disabled) {
                        this.reconnect([id,]);
                    }
                }
            });
        };
        this.resetMouse = () => {
            var _a;
            (_a = this.mouse) === null || _a === void 0 ? void 0 : _a.remove();
            this.mouse = null;
        };
        this.scroll = (id, d) => { var _a; id === this.agentID && ((_a = this.mouse) === null || _a === void 0 ? void 0 : _a.scroll(d)); };
        this.move = (id, xy) => {
            var _a;
            return id === this.agentID && ((_a = this.mouse) === null || _a === void 0 ? void 0 : _a.move(xy));
        };
        this.focused = null;
        this.click = (id, xy) => {
            if (id !== this.agentID || !this.mouse) {
                return;
            }
            this.focused = this.mouse.click(xy);
        };
        this.focus = (id, el) => {
            this.focused = el;
        };
        this.input = (id, value) => {
            if (id !== this.agentID || !this.mouse || !this.focused) {
                return;
            }
            if (this.focused instanceof HTMLTextAreaElement
                || this.focused instanceof HTMLInputElement
                || this.focused.tagName === 'INPUT'
                || this.focused.tagName === 'TEXTAREA') {
                setInputValue.call(this.focused, value);
                const ev = new Event('input', { bubbles: true, });
                this.focused.dispatchEvent(ev);
            }
            else if (this.focused.isContentEditable) {
                this.focused.innerText = value;
            }
        };
    }
    reconnect(ids) {
        const storedID = sessionStorage.getItem(this.options.session_control_peer_key);
        if (storedID !== null && ids.indexOf(storedID) !== -1) {
            this.grantControl(storedID);
        }
        else {
            sessionStorage.removeItem(this.options.session_control_peer_key);
        }
    }
}
exports.default = RemoteControl;
