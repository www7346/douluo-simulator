import './save-format.js';

declare global {var SoulSaveCodec:any;}
/** Current file and image format only. No game rules are loaded by this module. */
export const saveCodec=globalThis.SoulSaveCodec;
if(!saveCodec)throw new Error('存档格式模块未装载');
