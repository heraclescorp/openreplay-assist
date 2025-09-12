/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket, } from 'socket.io-client'
import { connect, } from 'socket.io-client'
import { App, } from '@openreplay/tracker'

type StartEndCallback = () => ((() => any) | void)

export interface Options {
  onAgentConnect: StartEndCallback;
  onRecordingRequest?: () => any;
  onRecordingDeny?: () => any;
  recordingConfirm: any;
  serverURL: string
}

// TODO typing????
type OptionalCallback = (()=>Record<string, unknown>) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  //
}

export default class Assist {
  readonly version = 'PACKAGE_VERSION'

  private socket: Socket | null = null
  private assistDemandedRestart = false

  private agents: Record<string, Agent> = {}
  private readonly options: Options
  constructor(
    private readonly app: App,
    options?: Partial<Options>,
  ) {
    this.options = Object.assign({
        serverURL: null,
        onAgentConnect: ()=>{},
        recordingConfirm: {},
      },
      options,
    )

    if (document.hidden !== undefined) {
      const sendActivityState = (): void => this.emit('UPDATE_SESSION', { active: !document.hidden, })
      app.attachEventListener(
        document,
        'visibilitychange',
        sendActivityState,
        false,
        false,
      )
    }
    const titleNode = document.querySelector('title')
    const observer = titleNode && new MutationObserver(() => {
      this.emit('UPDATE_SESSION', { pageTitle: document.title, })
    })
    app.attachStartCallback(() => {
      if (this.assistDemandedRestart) { return }
      this.onStart()
      observer && observer.observe(titleNode, { subtree: true, characterData: true, childList: true, })
    })
    app.attachStopCallback(() => {
      if (this.assistDemandedRestart) { return }
      this.clean()
      observer && observer.disconnect()
    })
    app.attachCommitCallback((messages) => {
      if (this.agentsConnected) {
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (messages.length === 2 && messages[0]._id === 0 &&  messages[1]._id === 49) { return }
        this.emit('messages', messages)
      }
    })
    app.session.attachUpdateCallback(sessInfo => this.emit('UPDATE_SESSION', sessInfo))
  }

  private emit(ev: string, args?: any): void {
    this.socket && this.socket.emit(ev, { meta: { tabId: this.app.getTabId(), }, data: args, })
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0
  }

  private getHost():string{
    if (this.options.serverURL){
      return new URL(this.options.serverURL).host
    }
    return this.app.getHost()
  }
  private getBasePrefixUrl(): string{
    if (this.options.serverURL){
      return new URL(this.options.serverURL).pathname
    }
    return ''
  }
  private onStart() {
    const app = this.app
    const sessionId = app.getSessionID()

    if (!sessionId) {
      return app.debug.error('No session ID')
    }
    const peerID = `${app.getProjectKey()}-${sessionId}-${this.app.getTabId()}`

    // SocketIO
    const socket = this.socket = connect(this.getHost(), {
      path: this.getBasePrefixUrl()+'/ws-assist/socket',
      query: {
        'peerId': peerID,
        'identity': 'session',
        'tabId': this.app.getTabId(),
        'sessionInfo': JSON.stringify({
          pageTitle: document.title,
          active: true,
          ...this.app.getSessionInfo(),
        }),
      },
      transports: ['websocket',],
    })
    socket.onAny((...args) => {
      if (args[0] === 'messages' || args[0] === 'UPDATE_SESSION') {
        return
      }
      app.debug.log('Socket:', ...args)
    })

    socket.on('NEW_AGENT', (id: string) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect?.(),
      }
      this.assistDemandedRestart = true
      this.app.stop()
      setTimeout(() => {
        this.app.start().then(() => { this.assistDemandedRestart = false })
          .catch(e => app.debug.error(e))
        // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
      }, 500)
    })
  }

  private clean() {
    if (this.socket) {
      this.socket.disconnect()
      this.app.debug.log('Socket disconnected')
    }
  }
}
