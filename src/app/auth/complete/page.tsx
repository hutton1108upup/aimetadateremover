import type {Metadata} from "next";
import {AuthComplete} from "@/components/auth/auth-window";
export const metadata:Metadata={title:"Google sign-in",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){const {error}=await searchParams;return <main className="auth-window"><AuthComplete hasError={Boolean(error)}/></main>;}
