"use client";
import {useEffect,useRef,useState} from "react";
import {authClient} from "@/lib/auth/client";

export function AuthStart() {
  const started=useRef(false);
  const [message,setMessage]=useState("Connecting to Google…");
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(started.current)return;started.current=true;
    void (async()=>{
      try{
        const response=await fetch("/api/auth/status",{cache:"no-store"});
        if(!response.ok || !(await response.json() as {enabled?:boolean})?.enabled)throw new Error();
        const result=await authClient.signIn.social({provider:"google",callbackURL:`${window.location.origin}/auth/complete`,errorCallbackURL:`${window.location.origin}/auth/complete?error=auth_failed`});
        if(result.error)throw new Error();
      }catch{setFailed(true);setMessage("Google sign-in is unavailable right now. Your original workspace is unchanged.");}
    })();
  },[]);
  return <div className="auth-window-card"><h1>Sign in with Google</h1><p role="status">{message}</p><p>Your images remain in the original window.</p>{failed && <button className="button primary" onClick={()=>window.location.reload()}>Try again</button>}</div>;
}

export function AuthComplete({hasError}:{hasError:boolean}) {
  const [state,setState]=useState<"checking"|"success"|"failed">(hasError?"failed":"checking");
  useEffect(()=>{
    if(hasError)return;let current=true;
    void authClient.getSession().then(result=>{
      if(!current)return;
      if(!result.data?.user){setState("failed");return;}
      setState("success");
      try{window.opener?.postMessage({type:"imagefinisher:auth-complete"},window.location.origin);}catch{}
      if(window.opener)window.close();
    }).catch(()=>{if(current)setState("failed");});
    return ()=>{current=false;};
  },[hasError]);
  return <div className="auth-window-card"><h1>{state==="success"?"You’re signed in":state==="failed"?"Sign-in was not completed":"Checking your session…"}</h1><p role="status">{state==="success"?"Return to your original workspace. Your images are still there.":state==="failed"?"You can try again or close this window. Your original workspace is unchanged.":"Please wait a moment."}</p>{state==="failed" && <a className="button primary" href="/auth/start">Try again</a>}<button className="button secondary" onClick={()=>window.close()}>Close this window</button></div>;
}
