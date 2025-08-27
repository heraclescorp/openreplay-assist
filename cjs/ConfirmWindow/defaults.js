"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRequestDefault = exports.controlConfirmDefault = exports.callConfirmDefault = void 0;
const icons_js_1 = require("../icons.js");
const TEXT_GRANT_REMORTE_ACCESS = 'Grant Remote Control';
const TEXT_REJECT = 'Reject';
const TEXT_ANSWER_CALL = `${icons_js_1.acceptCall} &#xa0 Answer`;
const TEXT_ACCEPT_RECORDING = 'Allow Recording';
function confirmDefault(opts, confirmBtn, declineBtn, text) {
    const isStr = typeof opts === 'string';
    return Object.assign({
        text: isStr ? opts : text,
        confirmBtn,
        declineBtn,
    }, isStr ? undefined : opts);
}
const callConfirmDefault = (opts) => confirmDefault(opts, TEXT_ANSWER_CALL, TEXT_REJECT, 'You have an incoming call. Do you want to answer?');
exports.callConfirmDefault = callConfirmDefault;
const controlConfirmDefault = (opts) => confirmDefault(opts, TEXT_GRANT_REMORTE_ACCESS, TEXT_REJECT, 'Agent requested remote control. Allow?');
exports.controlConfirmDefault = controlConfirmDefault;
const recordRequestDefault = (opts) => confirmDefault(opts, TEXT_ACCEPT_RECORDING, TEXT_REJECT, 'Agent requested to record activity in this browser tab.');
exports.recordRequestDefault = recordRequestDefault;
