"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { getBatchLimits } from "@/lib/image-metadata-core/limits";
import { mapWithConcurrency } from "@/lib/concurrency";
import { cleanLocally, scanLocally, validateBrowserImage } from "@/lib/local-processor";
import { trackFunnel } from "@/lib/funnel";
import { releaseBuffer } from "@/lib/release-buffer";
import type { CleanPolicy, FileStage, ScanResult, VerificationResult } from "@/lib/image-metadata-core/types";

export interface LocalImage {
  id: string; file: File; source: "file" | "sample"; status: FileStage;
  preview?: string; scan?: ScanResult; error?: string;
  cleaned?: ArrayBuffer; verification?: VerificationResult; cleanPreview?: string;
}
const mime = (scan?: ScanResult) => scan?.format === "jpeg" ? "image/jpeg" : scan?.format === "webp" ? "image/webp" : "image/png";
const revoke = (url?: string) => { if(url) URL.revokeObjectURL?.(url); };
const release = (file: LocalImage) => { revoke(file.preview);revoke(file.cleanPreview);releaseBuffer(file.cleaned); };
export const unresolvedCount = (v: VerificationResult) => v.items.filter(i=>!["removed","preserved"].includes(i.after)).length;
export function downloadLocal(buffer: BlobPart, name: string, type: string) {
  const url=URL.createObjectURL(new Blob([buffer],{type}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download=name;
  try { document.body.append(anchor);anchor.click(); } finally { anchor.remove();setTimeout(()=>revoke(url),1000); }
}
function errorMessage(error: unknown) {
  const code=(error as {code?:string})?.code;
  if(code === "invalid_file") return "This file is not a supported JPEG, PNG, or WebP image.";
  if(code === "pixel_limit") return "This image exceeds the safe pixel limit. Try a smaller image.";
  if(code === "verification_failed") return "The output did not pass integrity checks. No download was created.";
  if(code === "decode_failed") return "The cleaned copy could not be decoded. Your original is unchanged.";
  if(code === "processing_timeout") return "Local processing timed out. Try a smaller file.";
  if(code === "unsupported_exif" || code === "unsupported_thumbnail") return "This EXIF or thumbnail structure is not supported by Privacy Clean. No copy was created.";
  return "This image could not be processed safely. Your original is unchanged.";
}

export function useLocalWorkspace(acceptedFormats?: Array<"jpeg"|"png"|"webp">) {
  const [files,setFiles]=useState<LocalImage[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const filesRef=useRef<LocalImage[]>([]);
  const mounted=useRef(true), locked=useRef(false);
  const controllers=useRef(new Map<string,AbortController>());
  const delivered=useRef(new Set<string>());
  const limits=()=>getBatchLimits(typeof window==="undefined"?1440:window.innerWidth);
  function commit(next:LocalImage[]) { if(!mounted.current)return;filesRef.current=next;setFiles(next); }
  function patch(id:string,change:Partial<LocalImage>) { commit(filesRef.current.map(f=>f.id===id?{...f,...change}:f)); }
  function present(id:string) { return mounted.current && filesRef.current.some(f=>f.id===id); }
  function begin() { if(locked.current)return false;locked.current=true;setBusy(true);setNotice("");return true; }
  function finish() { locked.current=false;if(mounted.current)setBusy(false); }
  useEffect(()=>{
    mounted.current=true;
    const tasks=controllers.current;
    return ()=> { mounted.current=false;tasks.forEach(c=>c.abort());tasks.clear();filesRef.current.forEach(release);filesRef.current=[]; };
  },[]);

  async function addFiles(list:File[],source:"file"|"sample"="file") {
    if(!list.length || !begin()) return;
    const cap=limits();
    let bytes=filesRef.current.reduce((n,f)=>n+f.file.size,0);
    const accepted:LocalImage[]=[];let skipped=0;
    for(const file of list) {
      if(filesRef.current.length+accepted.length>=cap.maxFiles || file.size>cap.maxFileBytes || bytes+file.size>cap.maxBatchBytes) {skipped++;continue;}
      bytes+=file.size;
      accepted.push({id:crypto.randomUUID(),file,source,status:"queued"});
    }
    if(skipped) setNotice(`${skipped} file(s) skipped. Limit: ${cap.maxFiles} files, 25 MB each, ${cap.maxBatchBytes/1024/1024} MB total.`);
    commit([...filesRef.current,...accepted]);
    if(accepted.length) trackFunnel("select_files",{source,count:accepted.length,device:cap.concurrency===1?"mobile":"desktop"});
    try {
      await mapWithConcurrency(accepted,cap.concurrency,async item=>{
        if(!present(item.id))return;
        const controller=new AbortController();controllers.current.set(item.id,controller);
        const start=performance.now();patch(item.id,{status:"scanning"});
        try {
          const buffer=await item.file.arrayBuffer();controller.signal.throwIfAborted();
          const scan=await scanLocally(buffer,controller.signal);controller.signal.throwIfAborted();
          if(acceptedFormats && !acceptedFormats.includes(scan.format)) {patch(item.id,{status:"unsupported",error:`This page accepts ${acceptedFormats.join(", ").toUpperCase()} images.`});return;}
          const maxPixels=cap.concurrency===1?16_000_000:40_000_000;
          if(scan.properties.width && scan.properties.height && scan.properties.width*scan.properties.height>maxPixels) throw Object.assign(new Error(),{code:"pixel_limit"});
          if(scan.properties.width) {
            const decodeInput=await item.file.arrayBuffer();controller.signal.throwIfAborted();
            try {await validateBrowserImage(decodeInput,mime(scan));}catch{throw Object.assign(new Error(),{code:"decode_failed"});}
            controller.signal.throwIfAborted();
          }
          if(!present(item.id))return;
          // Validation bitmaps are closed immediately; only the selected preview is rendered.
          const preview=scan.properties.width && typeof URL.createObjectURL === "function" ? URL.createObjectURL(item.file) : undefined;
          patch(item.id,{scan,preview,status:"ready_for_action"});
          trackFunnel("scan_success",{source,format:scan.format,size:item.file.size,duration:performance.now()-start});
        } catch(error) {
          if(controller.signal.aborted || !present(item.id))return;
          patch(item.id,{status:"unsupported",error:errorMessage(error)});
          trackFunnel("scan_failed",{source,error:(error as {code?:string}).code ?? "processing_failed"});
        } finally {controllers.current.delete(item.id);}
      });
    } finally {finish();}
  }

  async function cleanFiles(ids:string[],policy:CleanPolicy) {
    if(policy.mode === "full" || !begin())return false;
    const selected=filesRef.current.filter(f=>ids.includes(f.id) && f.scan && f.scan.cleanSupport!=="scan_only");
    let completed=0;
    try {
      await mapWithConcurrency(selected,limits().concurrency,async item=>{
        if(!present(item.id))return;
        const controller=new AbortController();controllers.current.set(item.id,controller);
        revoke(item.cleanPreview);releaseBuffer(item.cleaned);delivered.current.delete(item.id);
        patch(item.id,{cleaned:undefined,cleanPreview:undefined,verification:undefined,error:undefined,status:"cleaning"});
        const start=performance.now();
        try {
          const input=await item.file.arrayBuffer();controller.signal.throwIfAborted();
          const {clean,verification}=await cleanLocally(input,{...policy,removeC2pa:policy.removeC2pa && item.scan?.format==="png"},controller.signal);
          controller.signal.throwIfAborted();
          if(!clean.output || verification.encodedPayloadPreserved!==true || verification.orientationPreserved===false || verification.dimensionsChanged===true || (!policy.removeColorProfile && verification.iccPreserved===false) || verification.transparencyPreserved===false) throw Object.assign(new Error(),{code:"verification_failed"});
          patch(item.id,{status:"verifying"});
          try { await validateBrowserImage(clean.output,mime(item.scan)); }catch{throw Object.assign(new Error(),{code:"decode_failed"});}
          controller.signal.throwIfAborted();if(!present(item.id))return;
          const cleanPreview=typeof URL.createObjectURL==="function" ? URL.createObjectURL(new Blob([clean.output],{type:mime(item.scan)})):undefined;
          patch(item.id,{cleaned:clean.output,verification,cleanPreview,status:"ready"});completed++;
          const fields={source:item.source,format:item.scan!.format,mode:policy.mode,duration:performance.now()-start};
          trackFunnel("clean_success",fields);
          trackFunnel(unresolvedCount(verification)?"verify_review":"verify_success",fields);
        }catch(error){
          if(controller.signal.aborted || !present(item.id))return;
          patch(item.id,{status:"failed",error:errorMessage(error)});
          trackFunnel("clean_failed",{source:item.source,format:item.scan?.format,mode:policy.mode,error:(error as {code?:string}).code??"processing_failed"});
        }finally{controllers.current.delete(item.id);}
      });
      if(mounted.current) setNotice(`${completed} of ${selected.length} supported file(s) ready to download. ${ids.length-selected.length} scan-only or unreadable file(s) skipped.`);
      return completed>0;
    }finally{finish();}
  }
  function removeFile(id:string) {
    controllers.current.get(id)?.abort();controllers.current.delete(id);
    const file=filesRef.current.find(f=>f.id===id);if(file)release(file);
    delivered.current.delete(id);commit(filesRef.current.filter(f=>f.id!==id));
  }
  function clearFiles() {controllers.current.forEach(c=>c.abort());controllers.current.clear();filesRef.current.forEach(release);delivered.current.clear();commit([]);setNotice("");}
  function recordDownload(item:LocalImage,delivery:"single"|"zip") {
    if(delivered.current.has(item.id))return;delivered.current.add(item.id);
    trackFunnel("download",{source:item.source,format:item.scan?.format,result:item.verification && !unresolvedCount(item.verification)?"verified":"review_needed",delivery});
  }
  function downloadOne(item:LocalImage) {if(!item.cleaned || busy)return;downloadLocal(item.cleaned,`clean-${item.file.name}`,mime(item.scan));recordDownload(item,"single");}
  async function downloadZip() {
    if(!begin())return;
    const selected=filesRef.current.filter(f=>f.cleaned && f.verification);
    try {
      const zip=new JSZip();
      // Index prefixes prevent duplicate filenames from overwriting ZIP entries.
      selected.forEach((f,i)=>zip.file(`${String(i+1).padStart(2,"0")}-clean-${f.file.name.replace(/[\\/]/g,"_")}`,f.cleaned!));
      const blob=await zip.generateAsync({type:"blob",compression:"STORE",streamFiles:true});
      if(!mounted.current || selected.some(f=>!present(f.id)))return;
      downloadLocal(blob,"clean-images.zip","application/zip");selected.forEach(f=>recordDownload(f,"zip"));
    }catch{if(mounted.current)setNotice("The ZIP could not be created. Download individual copies or try a smaller batch.");}finally{finish();}
  }
  return {files,filesRef,busy,notice,addFiles,cleanFiles,removeFile,clearFiles,downloadOne,downloadZip};
}
