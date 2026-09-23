"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { LogIn,LogOut,UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";

type Profile={id:string;name:string;email:string};
export function AuthControls() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [enabled,setEnabled]=useState(false),[loading,setLoading]=useState(true),[waiting,setWaiting]=useState(false);
  const [message,setMessage]=useState("");
  const alive=useRef(true),pending=useRef(false),generation=useRef(0);
  const timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
  const refresh=useCallback(async()=>{
    if(pending.current)return;
    pending.current=true;const version=generation.current;
    try {
      const response=await fetch("/api/auth/status",{cache:"no-store"});
      const status=response.ok?await response.json() as {enabled?:boolean}:null;
      const result=status?.enabled?await authClient.getSession():{data:null};
      if(!alive.current || version!==generation.current)return;
      setEnabled(Boolean(status?.enabled));setProfile(result.data?.user ?? null);
      if(result.data?.user){setWaiting(false);setMessage("");clearInterval(timer.current);}
    }catch{if(alive.current && version===generation.current){setProfile(null);setEnabled(false);}}
    finally{if(version===generation.current){pending.current=false;if(alive.current)setLoading(false);}}
  },[]);
  useEffect(()=>{
    alive.current=true;queueMicrotask(()=>{if(alive.current)void refresh();});
    const onFocus=()=>void refresh();
    const onMessage=(event:MessageEvent)=>{if(event.origin===window.location.origin && event.data?.type==="imagefinisher:auth-complete")void refresh();};
    window.addEventListener("focus",onFocus);window.addEventListener("message",onMessage);
    return ()=>{alive.current=false;pending.current=false;clearInterval(timer.current);window.removeEventListener("focus",onFocus);window.removeEventListener("message",onMessage);};
  },[refresh]);
  function signIn() {
    if(!enabled){setMessage("Sign-in is unavailable in this demo. You can keep using all local tools.");return;}
    const popup=window.open("/auth/start","imagefinisher-google","popup,width=500,height=680");
    if(!popup){setMessage("Please allow popups for this site, then try Sign in again. Your images stay here.");return;}
    setWaiting(true);setMessage("Complete Google sign-in in the other window. Your images stay here.");
    clearInterval(timer.current);const deadline=Date.now()+120_000;
    timer.current=setInterval(()=>{
      void refresh();
      if(popup.closed || Date.now()>deadline){clearInterval(timer.current);setWaiting(false);setMessage("Return here after Google sign-in, or try again if you closed the window.");}
    },1500);
  }
  async function signOut() {
    setLoading(true);generation.current++;pending.current=false;clearInterval(timer.current);
    try {const result=await authClient.signOut();if(result.error)throw new Error();generation.current++;pending.current=false;setProfile(null);setWaiting(false);setMessage("");}
    catch{setMessage("Sign-out did not finish. Please try again.");}
    finally{if(alive.current)setLoading(false);}
  }
  return <div className="auth-controls">
    {profile && <Link prefetch={false} className="auth-button" href="/account/billing">Billing</Link>}
    {profile?<><span className="auth-profile" title={profile.email}><UserRound aria-hidden="true"/><span>{profile.name}</span></span><button className="auth-button" onClick={()=>void signOut()} disabled={loading} aria-label="Sign out"><LogOut aria-hidden="true"/><span>Sign out</span></button></>:<button className="auth-button" onClick={signIn} disabled={loading || waiting} aria-label={waiting?"Signing in…":"Sign in"}><LogIn aria-hidden="true"/><span>{waiting?"Signing in…":"Sign in"}</span></button>}
    {message && <div className="auth-feedback" role="status"><p>{message}</p><button onClick={()=>setMessage("")} aria-label="Dismiss sign-in message">Dismiss</button></div>}
  </div>;
}
