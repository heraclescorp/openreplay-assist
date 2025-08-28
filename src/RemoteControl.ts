import Mouse from './Mouse.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { controlConfirmDefault, } from './ConfirmWindow/defaults.js'
import type { Options as AssistOptions, } from './Assist'

export enum RCStatus {
  Disabled,
  Requesting,
  Enabled,
}


let setInputValue = function(this: HTMLInputElement | HTMLTextAreaElement,  value: string) { this.value = value }
const nativeInputValueDescriptor = typeof window !== 'undefined' && Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
if (nativeInputValueDescriptor && nativeInputValueDescriptor.set) {
  setInputValue = nativeInputValueDescriptor.set
}


export default class RemoteControl {
  private mouse: Mouse | null = null
  public status: RCStatus = RCStatus.Disabled
  private agentID: string | null = null

  constructor(
    private readonly options: AssistOptions,
    private readonly onGrand: (id: string) => string | undefined,
    private readonly onRelease: (id?: string | null, isDenied?: boolean) => void) {}

  reconnect(ids: string[]) {
    console.log('Remote control is disabled.')
    return
  }

  private confirm: ConfirmWindow | null = null
  requestControl = (id: string) => {
    console.log('Remote control is disabled.')
    return
  }

  releaseControl = (isDenied?: boolean, keepId?: boolean) => {
    console.log('Remote control is disabled.')
    return
  }

  grantControl = (id: string) => {
    console.log('Remote control is disabled.')
    return
  }

  resetMouse = () => {
    console.log('Remote control is disabled.')
    return
  }

  scroll = (id, d) => { 
    console.log('Remote control is disabled.')
    return
  }
  move = (id, xy) => {
    console.log('Remote control is disabled.')
    return
  }
  private focused: HTMLElement | null = null
  click = (id, xy) => {
    console.log('Remote control is disabled.')
    return
  }
  focus = (id, el: HTMLElement) => {
    console.log('Remote control is disabled.')
    return
  }
  input = (id, value: string) => {
    console.log('Remote control is disabled.')
    return
  }
}
