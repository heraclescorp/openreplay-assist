"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
class Assist {
    constructor(app, options) {
        this.app = app;
        this.version = '6.0.0';
        this.socket = null;
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
    }
    clean() {
        if (this.socket) {
            this.socket.disconnect();
            this.app.debug.log('Socket disconnected');
        }
    }
}
exports.default = Assist;
