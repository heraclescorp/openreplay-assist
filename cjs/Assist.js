"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const peerjs_1 = require("peerjs");
const LocalStream_js_1 = require("./LocalStream.js");
const CallWindow_js_1 = require("./CallWindow.js");
const AnnotationCanvas_js_1 = require("./AnnotationCanvas.js");
const ConfirmWindow_js_1 = require("./ConfirmWindow/ConfirmWindow.js");
const defaults_js_1 = require("./ConfirmWindow/defaults.js");
const ScreenRecordingState_js_1 = require("./ScreenRecordingState.js");
// TODO: fully specified strict check with no-any (everywhere)
// @ts-ignore
const safeCastedPeer = peerjs_1.default.default || peerjs_1.default;
var CallingState;
(function (CallingState) {
    CallingState[CallingState["Requesting"] = 0] = "Requesting";
    CallingState[CallingState["True"] = 1] = "True";
    CallingState[CallingState["False"] = 2] = "False";
})(CallingState || (CallingState = {}));
class Assist {
    constructor(app, options, noSecureMode = false) {
        this.app = app;
        this.noSecureMode = noSecureMode;
        this.version = '6.0.0';
        this.socket = null;
        this.peer = null;
        this.assistDemandedRestart = false;
        this.callingState = CallingState.False;
        this.agents = {};
        this.setCallingState = (newState) => {
            this.callingState = newState;
        };
        this.options = Object.assign({
            session_calling_peer_key: '__openreplay_calling_peer',
            session_control_peer_key: '__openreplay_control_peer',
            config: null,
            serverURL: null,
            onCallStart: () => { },
            onAgentConnect: () => { },
            callConfirm: {},
            controlConfirm: {}, // TODO: clear options passing/merging/overwriting
            recordingConfirm: {},
        }, options);
        if (document.hidden !== undefined) {
            const sendActivityState = () => this.emit('UPDATE_SESSION', { active: !document.hidden, });
            app.attachEventListener(document, 'visibilitychange', sendActivityState, false, false);
        }
        const titleNode = document.querySelector('title');
        const observer = titleNode && new MutationObserver(() => {
            this.emit('UPDATE_SESSION', { pageTitle: document.title, });
        });
        app.attachStartCallback(() => {
            if (this.assistDemandedRestart) {
                return;
            }
            this.onStart();
            observer && observer.observe(titleNode, { subtree: true, characterData: true, childList: true, });
        });
        app.attachStopCallback(() => {
            if (this.assistDemandedRestart) {
                return;
            }
            this.clean();
            observer && observer.disconnect();
        });
        app.attachCommitCallback((messages) => {
            if (this.agentsConnected) {
                // @ts-ignore No need in statistics messages. TODO proper filter
                if (messages.length === 2 && messages[0]._id === 0 && messages[1]._id === 49) {
                    return;
                }
                this.emit('messages', messages);
            }
        });
        app.session.attachUpdateCallback(sessInfo => this.emit('UPDATE_SESSION', sessInfo));
    }
    emit(ev, args) {
        this.socket && this.socket.emit(ev, { meta: { tabId: this.app.getTabId(), }, data: args, });
    }
    get agentsConnected() {
        return Object.keys(this.agents).length > 0;
    }
    getHost() {
        if (this.options.serverURL) {
            return new URL(this.options.serverURL).host;
        }
        return this.app.getHost();
    }
    getBasePrefixUrl() {
        if (this.options.serverURL) {
            return new URL(this.options.serverURL).pathname;
        }
        return '';
    }
    onStart() {
        const app = this.app;
        const sessionId = app.getSessionID();
        // Common for all incoming call requests
        let callUI = null;
        let annot = null;
        // TODO: incapsulate
        let callConfirmWindow = null;
        let callConfirmAnswer = null;
        let callEndCallback = null;
        if (!sessionId) {
            return app.debug.error('No session ID');
        }
        const peerID = `${app.getProjectKey()}-${sessionId}-${this.app.getTabId()}`;
        // SocketIO
        const socket = this.socket = (0, socket_io_client_1.connect)(this.getHost(), {
            path: this.getBasePrefixUrl() + '/ws-assist/socket',
            query: {
                'peerId': peerID,
                'identity': 'session',
                'tabId': this.app.getTabId(),
                'sessionInfo': JSON.stringify(Object.assign({ pageTitle: document.title, active: true }, this.app.getSessionInfo())),
            },
            transports: ['websocket',],
        });
        socket.onAny((...args) => {
            if (args[0] === 'messages' || args[0] === 'UPDATE_SESSION') {
                return;
            }
            app.debug.log('Socket:', ...args);
        });
        const onAcceptRecording = () => {
            socket.emit('recording_accepted');
        };
        const onRejectRecording = (agentData) => {
            var _a, _b;
            socket.emit('recording_rejected');
            (_b = (_a = this.options).onRecordingDeny) === null || _b === void 0 ? void 0 : _b.call(_a, agentData || {});
        };
        const recordingState = new ScreenRecordingState_js_1.default(this.options.recordingConfirm);
        function processEvent(agentId, event, callback) {
            if (app.getTabId() === event.meta.tabId) {
                return callback === null || callback === void 0 ? void 0 : callback(agentId, event.data);
            }
        }
        // TODO: restrict by id
        socket.on('moveAnnotation', (id, event) => processEvent(id, event, (_, d) => annot && annot.move(d)));
        socket.on('startAnnotation', (id, event) => processEvent(id, event, (_, d) => annot === null || annot === void 0 ? void 0 : annot.start(d)));
        socket.on('stopAnnotation', (id, event) => processEvent(id, event, annot === null || annot === void 0 ? void 0 : annot.stop));
        socket.on('NEW_AGENT', (id, info) => {
            var _a, _b;
            this.agents[id] = {
                onDisconnect: (_b = (_a = this.options).onAgentConnect) === null || _b === void 0 ? void 0 : _b.call(_a, info),
                agentInfo: info, // TODO ?
            };
            this.assistDemandedRestart = true;
            this.app.stop();
            setTimeout(() => {
                this.app.start().then(() => { this.assistDemandedRestart = false; })
                    .catch(e => app.debug.error(e));
                // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
            }, 500);
        });
        socket.on('AGENTS_CONNECTED', (ids) => {
            ids.forEach(id => {
                var _a, _b, _c;
                const agentInfo = (_a = this.agents[id]) === null || _a === void 0 ? void 0 : _a.agentInfo;
                this.agents[id] = {
                    agentInfo,
                    onDisconnect: (_c = (_b = this.options).onAgentConnect) === null || _c === void 0 ? void 0 : _c.call(_b, agentInfo),
                };
            });
            this.assistDemandedRestart = true;
            this.app.stop();
            setTimeout(() => {
                this.app.start().then(() => { this.assistDemandedRestart = false; })
                    .catch(e => app.debug.error(e));
                // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
            }, 500);
        });
        socket.on('AGENT_DISCONNECTED', (id) => {
            var _a, _b;
            (_b = (_a = this.agents[id]) === null || _a === void 0 ? void 0 : _a.onDisconnect) === null || _b === void 0 ? void 0 : _b.call(_a);
            delete this.agents[id];
            recordingState.stopAgentRecording(id);
            endAgentCall(id);
        });
        socket.on('NO_AGENT', () => {
            Object.values(this.agents).forEach(a => { var _a; return (_a = a.onDisconnect) === null || _a === void 0 ? void 0 : _a.call(a); });
            this.agents = {};
            if (recordingState.isActive)
                recordingState.stopRecording();
        });
        socket.on('call_end', (id) => {
            if (!callingAgents.has(id)) {
                app.debug.warn('Received call_end from unknown agent', id);
                return;
            }
            endAgentCall(id);
        });
        socket.on('_agent_name', (id, info) => {
            if (app.getTabId() !== info.meta.tabId)
                return;
            const name = info.data;
            callingAgents.set(id, name);
            updateCallerNames();
        });
        socket.on('videofeed', (_, info) => {
            if (app.getTabId() !== info.meta.tabId)
                return;
            const feedState = info.data;
            callUI === null || callUI === void 0 ? void 0 : callUI.toggleVideoStream(feedState);
        });
        socket.on('request_recording', (id, info) => {
            var _a, _b;
            if (app.getTabId() !== info.meta.tabId)
                return;
            const agentData = info.data;
            if (!recordingState.isActive) {
                (_b = (_a = this.options).onRecordingRequest) === null || _b === void 0 ? void 0 : _b.call(_a, JSON.parse(agentData));
                recordingState.requestRecording(id, onAcceptRecording, () => onRejectRecording(agentData));
            }
            else {
                this.emit('recording_busy');
            }
        });
        socket.on('stop_recording', (id, info) => {
            if (app.getTabId() !== info.meta.tabId)
                return;
            if (recordingState.isActive) {
                recordingState.stopAgentRecording(id);
            }
        });
        const callingAgents = new Map(); // !! uses socket.io ID
        // TODO: merge peerId & socket.io id  (simplest way - send peerId with the name)
        const calls = {}; // !! uses peerJS ID
        const lStreams = {};
        // const callingPeers: Map<string, { call: MediaConnection, lStream: LocalStream }> = new Map() // Maybe
        function endAgentCall(id) {
            callingAgents.delete(id);
            if (callingAgents.size === 0) {
                handleCallEnd();
            }
            else {
                updateCallerNames();
                //TODO: close() specific call and corresponding lStreams (after connecting peerId & socket.io id)
            }
        }
        // PeerJS call (todo: use native WebRTC)
        const peerOptions = {
            host: this.getHost(),
            path: this.getBasePrefixUrl() + '/assist',
            port: location.protocol === 'http:' && this.noSecureMode ? 80 : 443,
            //debug: appOptions.__debug_log ? 2 : 0, // 0 Print nothing //1 Prints only errors. / 2 Prints errors and warnings. / 3 Prints all logs.
        };
        if (this.options.config) {
            peerOptions['config'] = this.options.config;
        }
        const peer = new safeCastedPeer(peerID, peerOptions);
        this.peer = peer;
        // @ts-ignore (peerjs typing)
        peer.on('error', e => app.debug.warn('Peer error: ', e.type, e));
        peer.on('disconnected', () => peer.reconnect());
        function updateCallerNames() {
            callUI === null || callUI === void 0 ? void 0 : callUI.setAssistentName(callingAgents);
        }
        const closeCallConfirmWindow = () => {
            if (callConfirmWindow) {
                callConfirmWindow.remove();
                callConfirmWindow = null;
                callConfirmAnswer = null;
            }
        };
        const requestCallConfirm = () => {
            if (callConfirmAnswer) { // Already asking
                return callConfirmAnswer;
            }
            callConfirmWindow = new ConfirmWindow_js_1.default((0, defaults_js_1.callConfirmDefault)(this.options.callConfirm || {
                text: this.options.confirmText,
                style: this.options.confirmStyle,
            })); // TODO: reuse ?
            return callConfirmAnswer = callConfirmWindow.mount().then(answer => {
                closeCallConfirmWindow();
                return answer;
            });
        };
        const handleCallEnd = () => {
            // Streams
            Object.values(calls).forEach(call => call.close());
            Object.keys(calls).forEach(peerId => {
                delete calls[peerId];
            });
            Object.values(lStreams).forEach((stream) => { stream.stop(); });
            Object.keys(lStreams).forEach((peerId) => { delete lStreams[peerId]; });
            // UI
            closeCallConfirmWindow();
            callUI === null || callUI === void 0 ? void 0 : callUI.hideControls();
            this.emit('UPDATE_SESSION', { agentIds: [], isCallActive: false, });
            this.setCallingState(CallingState.False);
            sessionStorage.removeItem(this.options.session_calling_peer_key);
            callEndCallback === null || callEndCallback === void 0 ? void 0 : callEndCallback();
        };
        const initiateCallEnd = () => {
            this.emit('call_end');
            handleCallEnd();
        };
        const updateVideoFeed = ({ enabled, }) => { var _a; return this.emit('videofeed', { streamId: (_a = this.peer) === null || _a === void 0 ? void 0 : _a.id, enabled, }); };
        peer.on('call', (call) => {
            app.debug.log('Incoming call from', call.peer);
            let confirmAnswer;
            const callingPeerIds = JSON.parse(sessionStorage.getItem(this.options.session_calling_peer_key) || '[]');
            if (callingPeerIds.includes(call.peer) || this.callingState === CallingState.True) {
                confirmAnswer = Promise.resolve(true);
            }
            else {
                this.setCallingState(CallingState.Requesting);
                confirmAnswer = requestCallConfirm();
                this.playNotificationSound(); // For every new agent during confirmation here
                // TODO: only one (latest) timeout
                setTimeout(() => {
                    if (this.callingState !== CallingState.Requesting) {
                        return;
                    }
                    initiateCallEnd();
                }, 30000);
            }
            confirmAnswer.then(async (agreed) => {
                var _a, _b, _c, _d;
                if (!agreed) {
                    initiateCallEnd();
                    (_b = (_a = this.options).onCallDeny) === null || _b === void 0 ? void 0 : _b.call(_a);
                    return;
                }
                // Request local stream for the new connection
                try {
                    // lStreams are reusable so fare we don't delete them in the `endAgentCall`
                    if (!lStreams[call.peer]) {
                        app.debug.log('starting new stream for', call.peer);
                        lStreams[call.peer] = await (0, LocalStream_js_1.default)();
                    }
                    calls[call.peer] = call;
                }
                catch (e) {
                    app.debug.error('Audio media device request error:', e);
                    initiateCallEnd();
                    return;
                }
                // UI
                if (!callUI) {
                    callUI = new CallWindow_js_1.default(app.debug.error, this.options.callUITemplate);
                    callUI.setVideoToggleCallback(updateVideoFeed);
                }
                callUI.showControls(initiateCallEnd);
                if (!annot) {
                    annot = new AnnotationCanvas_js_1.default();
                    annot.mount();
                }
                // have to be updated
                callUI.setLocalStreams(Object.values(lStreams));
                call.on('error', e => {
                    app.debug.warn('Call error:', e);
                    initiateCallEnd();
                });
                call.on('stream', (rStream) => {
                    callUI === null || callUI === void 0 ? void 0 : callUI.addRemoteStream(rStream, call.peer);
                    const onInteraction = () => {
                        callUI === null || callUI === void 0 ? void 0 : callUI.playRemote();
                        document.removeEventListener('click', onInteraction);
                    };
                    document.addEventListener('click', onInteraction);
                });
                // remote video on/off/camera change
                lStreams[call.peer].onVideoTrack(vTrack => {
                    const sender = call.peerConnection.getSenders().find(s => { var _a; return ((_a = s.track) === null || _a === void 0 ? void 0 : _a.kind) === 'video'; });
                    if (!sender) {
                        app.debug.warn('No video sender found');
                        return;
                    }
                    app.debug.log('sender found:', sender);
                    void sender.replaceTrack(vTrack);
                });
                call.answer(lStreams[call.peer].stream);
                document.addEventListener('visibilitychange', () => {
                    initiateCallEnd();
                });
                this.setCallingState(CallingState.True);
                if (!callEndCallback) {
                    callEndCallback = (_d = (_c = this.options).onCallStart) === null || _d === void 0 ? void 0 : _d.call(_c);
                }
                const callingPeerIds = Object.keys(calls);
                sessionStorage.setItem(this.options.session_calling_peer_key, JSON.stringify(callingPeerIds));
                this.emit('UPDATE_SESSION', { agentIds: callingPeerIds, isCallActive: true, });
            }).catch(reason => {
                app.debug.log(reason);
            });
        });
    }
    playNotificationSound() {
        if ('Audio' in window) {
            new Audio('https://static.openreplay.com/tracker-assist/notification.mp3')
                .play()
                .catch(e => {
                this.app.debug.warn(e);
            });
        }
    }
    clean() {
        // sometimes means new agent connected so we keep id for control
        if (this.peer) {
            this.peer.destroy();
            this.app.debug.log('Peer destroyed');
        }
        if (this.socket) {
            this.socket.disconnect();
            this.app.debug.log('Socket disconnected');
        }
    }
}
exports.default = Assist;
