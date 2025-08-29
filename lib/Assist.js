import { connect, } from 'socket.io-client';
import Peer from 'peerjs';
import ScreenRecordingState from './ScreenRecordingState.js';
// TODO: fully specified strict check with no-any (everywhere)
// @ts-ignore
const safeCastedPeer = Peer.default || Peer;
export default class Assist {
    constructor(app, options, noSecureMode = false) {
        this.app = app;
        this.noSecureMode = noSecureMode;
        this.version = '6.0.0';
        this.socket = null;
        this.peer = null;
        this.assistDemandedRestart = false;
        this.agents = {};
        this.options = Object.assign({
            serverURL: null,
            onAgentConnect: () => { },
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
        if (!sessionId) {
            return app.debug.error('No session ID');
        }
        const peerID = `${app.getProjectKey()}-${sessionId}-${this.app.getTabId()}`;
        // SocketIO
        const socket = this.socket = connect(this.getHost(), {
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
        const recordingState = new ScreenRecordingState(this.options.recordingConfirm);
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
        });
        socket.on('NO_AGENT', () => {
            Object.values(this.agents).forEach(a => { var _a; return (_a = a.onDisconnect) === null || _a === void 0 ? void 0 : _a.call(a); });
            this.agents = {};
            if (recordingState.isActive)
                recordingState.stopRecording();
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
        // PeerJS call (todo: use native WebRTC)
        const peerOptions = {
            host: this.getHost(),
            path: this.getBasePrefixUrl() + '/assist',
            port: location.protocol === 'http:' && this.noSecureMode ? 80 : 443,
            //debug: appOptions.__debug_log ? 2 : 0, // 0 Print nothing //1 Prints only errors. / 2 Prints errors and warnings. / 3 Prints all logs.
        };
        const peer = new safeCastedPeer(peerID, peerOptions);
        this.peer = peer;
        // @ts-ignore (peerjs typing)
        peer.on('error', e => app.debug.warn('Peer error: ', e.type, e));
        peer.on('disconnected', () => peer.reconnect());
        peer.on('call', (call) => {
            app.debug.log('Calls are not supported');
        });
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
