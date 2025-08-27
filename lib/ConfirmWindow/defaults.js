import { acceptCall, } from '../icons.js';
const TEXT_GRANT_REMORTE_ACCESS = 'Grant Remote Control';
const TEXT_REJECT = 'Reject';
const TEXT_ANSWER_CALL = `${acceptCall} &#xa0 Answer`;
const TEXT_ACCEPT_RECORDING = 'Allow Recording';
function confirmDefault(opts, confirmBtn, declineBtn, text) {
    const isStr = typeof opts === 'string';
    return Object.assign({
        text: isStr ? opts : text,
        confirmBtn,
        declineBtn,
    }, isStr ? undefined : opts);
}
export const callConfirmDefault = (opts) => confirmDefault(opts, TEXT_ANSWER_CALL, TEXT_REJECT, 'You have an incoming call. Do you want to answer?');
export const controlConfirmDefault = (opts) => confirmDefault(opts, TEXT_GRANT_REMORTE_ACCESS, TEXT_REJECT, 'Agent requested remote control. Allow?');
export const recordRequestDefault = (opts) => confirmDefault(opts, TEXT_ACCEPT_RECORDING, TEXT_REJECT, 'Agent requested to record activity in this browser tab.');
