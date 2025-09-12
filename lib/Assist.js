import { connect, } from 'socket.io-client';
import ScreenRecordingState from './ScreenRecordingState.js';
export default class Assist {
    constructor(app, options, noSecureMode = false) {
        this.app = app;
        this.noSecureMode = noSecureMode;
        this.version = '6.0.0';
        this.socket = null;
        this.assistDemandedRestart = false;
        this.initializationInterval = null;
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
            // @ts-ignore No need in statistics messages. TODO proper filter
            if (messages.length === 2 && messages[0]._id === 0 && messages[1]._id === 49) {
                return;
            }
            this.emit('messages', messages);
        });
        // Send essential initialization messages directly
        setTimeout(() => {
            this.sendInitializationMessages();
        }, 1000);
        // Start periodic initialization message sending every 5 seconds
        this.startPeriodicInitialization();
        app.session.attachUpdateCallback(sessInfo => this.emit('UPDATE_SESSION', sessInfo));
    }
    emit(ev, args) {
        this.socket && this.socket.emit(ev, { meta: { tabId: this.app.getTabId(), }, data: args, });
    }
    sendInitializationMessages() {
        if (!this.socket)
            return;
        console.log('Sending essential initialization messages...');
        // Send the messages that create document context
        const messages = [
            [4, window.location.href, document.referrer, performance.now()], // SetPageLocation
            [5, window.innerWidth, window.innerHeight], // SetViewportSize  
            [55, document.hidden] // SetPageVisibility
        ];
        messages.forEach(msg => {
            this.emit('messages', [msg]);
        });
    }
    startPeriodicInitialization() {
        // Clear any existing interval
        if (this.initializationInterval) {
            clearInterval(this.initializationInterval);
        }
        // Send initialization messages every 5 seconds
        this.initializationInterval = setInterval(() => {
            this.sendInitializationMessages();
        }, 5000);
    }
    stopPeriodicInitialization() {
        if (this.initializationInterval) {
            clearInterval(this.initializationInterval);
            this.initializationInterval = null;
        }
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
        // Restart periodic initialization when socket connects
        this.startPeriodicInitialization();
    }
    clean() {
        // Stop periodic initialization
        this.stopPeriodicInitialization();
        // sometimes means new agent connected so we keep id for control
        if (this.socket) {
            this.socket.disconnect();
            this.app.debug.log('Socket disconnected');
        }
    }
}
