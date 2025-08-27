import './_slim.js';
import type { App } from '@openreplay/tracker/cjs';
import type { Options } from './Assist.js';
import Assist from './Assist.js';
export default function (opts?: Partial<Options>): (app: App | null, appOptions?: {
    __DISABLE_SECURE_MODE?: boolean;
}) => Assist | undefined;
