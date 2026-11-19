import {STORY_ACTION_SCHEMA} from '../src/runtime/story-turns';
import {STORY_WRITING_ACTION_GROUPS} from '../src/runtime/story-writing-facts';

// Build-time registration check only: no world, model request or save is created.
const kinds=STORY_ACTION_SCHEMA.map(action=>action.kind);
const missing=kinds.filter(kind=>!STORY_WRITING_ACTION_GROUPS[kind]);
const obsolete=Object.keys(STORY_WRITING_ACTION_GROUPS).filter(kind=>!kinds.includes(kind));
if(missing.length||obsolete.length)throw Error(`写作行动登记不完整：${JSON.stringify({missing,obsolete})}`);
process.stdout.write(`Story writing registration verified: ${kinds.length} actions.\n`);
