/** Detach discarded bytes: React may retain the previous render until another update. */
export function releaseBuffer(buffer?: ArrayBuffer) {
  if(!buffer?.byteLength || typeof structuredClone!=="function")return;
  structuredClone(buffer,{transfer:[buffer]});
}
