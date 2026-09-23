"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
interface Allowance { enabled:boolean; singleRemaining:number; batchRemaining:number; batchLimit:number; }
export function UsageAllowance(){
  const [allowance,setAllowance]=useState<Allowance|null>(null);
  useEffect(()=>{let alive=true;const refresh=async()=>{try{const response=await fetch("/api/billing/status",{cache:"no-store"});if(response.ok && alive)setAllowance(await response.json());}catch{/* The reservation endpoint still enforces limits if this display is unavailable. */}};void refresh();window.addEventListener("imagefinisher:usage-changed",refresh);window.addEventListener("focus",refresh);return()=>{alive=false;window.removeEventListener("imagefinisher:usage-changed",refresh);window.removeEventListener("focus",refresh);};},[]);
  if(!allowance?.enabled)return null;
  return <p className="batch-notice" aria-live="polite">Today: {allowance.singleRemaining} free single-image cleans{allowance.batchLimit>0?` · ${allowance.batchRemaining} Pro batch tasks`:""} remaining. Resets 00:00 UTC. <Link href="/pricing">Plans</Link> · <Link href="/account/billing">Account billing</Link></p>;
}
