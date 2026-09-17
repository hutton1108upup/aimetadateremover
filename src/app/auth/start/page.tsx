import type {Metadata} from "next";
import {AuthStart} from "@/components/auth/auth-window";
export const metadata:Metadata={title:"Sign in with Google",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function Page(){return <main className="auth-window"><AuthStart/></main>;}
