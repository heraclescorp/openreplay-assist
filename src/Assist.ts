/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket, } from 'socket.io-client'
import { connect, } from 'socket.io-client'
import { App, } from '@openreplay/tracker'

import ScreenRecordingState from './ScreenRecordingState.js'

// TODO: fully specified strict check with no-any (everywhere)

type StartEndCallback = (agentInfo?: Record<string, any>) => ((() => any) | void)

export interface Options {
  onAgentConnect: StartEndCallback;
  onRecordingRequest?: (agentInfo: Record<string, any>) => any;
  onRecordingDeny?: (agentInfo: Record<string, any>) => any;
  recordingConfirm: any;
  serverURL: string
}

// TODO typing????
type OptionalCallback = (()=>Record<string, unknown>) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  agentInfo: Record<string, string> | undefined
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
    private readonly noSecureMode: boolean = false,
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

    const onAcceptRecording = () => {
      socket.emit('recording_accepted')
    }
    const onRejectRecording = (agentData) => {
      socket.emit('recording_rejected')

      this.options.onRecordingDeny?.(agentData || {})
    }
    const recordingState = new ScreenRecordingState(this.options.recordingConfirm)

    socket.on('NEW_AGENT', (id: string, info) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect?.(info),
        agentInfo: info, // TODO ?
      }
      this.assistDemandedRestart = true
      this.app.stop()
      setTimeout(() => {
        this.app.start().then(() => { this.assistDemandedRestart = false })
          .catch(e => app.debug.error(e))
        // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
      }, 500)
    })
    socket.on('AGENTS_CONNECTED', (ids: string[]) => {
      ids.forEach(id =>{
        const agentInfo = this.agents[id]?.agentInfo
        this.agents[id] = {
          agentInfo,
          onDisconnect: this.options.onAgentConnect?.(agentInfo),
        }
      })
      this.assistDemandedRestart = true
      this.app.stop()
      setTimeout(() => {
        this.app.start().then(() => { this.assistDemandedRestart = false })
          .catch(e => app.debug.error(e))
        // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
      }, 500)

    })

    socket.on('AGENT_DISCONNECTED', (id) => {
      this.agents[id]?.onDisconnect?.()
      delete this.agents[id]

      recordingState.stopAgentRecording(id)
    })
    
    socket.on('NO_AGENT', () => {
      Object.values(this.agents).forEach(a => a.onDisconnect?.())
      this.agents = {}
      if (recordingState.isActive) recordingState.stopRecording()
    })

    socket.on('request_recording', (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      const agentData = info.data
      if (!recordingState.isActive) {
        this.options.onRecordingRequest?.(JSON.parse(agentData))
        recordingState.requestRecording(id, onAcceptRecording, () => onRejectRecording(agentData))
      } else {
        this.emit('recording_busy')
      }
    })

    socket.on('stop_recording', (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      if (recordingState.isActive) {
        recordingState.stopAgentRecording(id)
      }
    })
  }

  private clean() {
    // sometimes means new agent connected so we keep id for control
    if (this.socket) {
      this.socket.disconnect()
      this.app.debug.log('Socket disconnected')
    }
  }
}
