import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile, mkdir,writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const bundle=await build({entryPoints:["scripts/auth-d1-qa.worker.ts"],bundle:true,write:false,format:"esm",platform:"neutral",conditions:["workerd","worker","browser"],external:["node:*"],target:"es2022"});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:"2026-09-09",compatibilityFlags:["nodejs_compat"],d1Databases:{AUTH_DB:"auth-d1-qa"},bindings:{AUTH_BASE_URL:"http://localhost:3180",AUTH_SECRET:randomBytes(48).toString("hex"),GOOGLE_CLIENT_ID:"test.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"test-only"}}));
const checks=[];
const pass=name=>{checks.push(name);console.log("PASS "+name);};
const call=(path,init={})=>mf.dispatchFetch("http://localhost:3180"+path,{redirect:"manual",...init});
try {
  const db=await mf.getD1Database("AUTH_DB");
  const sql=await readFile("migrations/0001_google_auth.sql","utf8");
  await db.batch(sql.split(";").map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const schema=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'auth_%'").all();
  assert.equal(schema.results.length,4);pass("four auth tables migrated in real local workerd D1");
  const fixtureResponse=await call("/fixture");assert.equal(fixtureResponse.status,200);
  const fixture=await fixtureResponse.json();assert.ok(fixture.cookie);
  const current=await call("/api/auth/get-session",{headers:{cookie:fixture.cookie}});const session=await current.json();
  assert.equal(session.user.id,fixture.id);pass("Better Auth D1 OAuth-account/session creation and signed-cookie session lookup");
  const repeat=await call("/fixture");assert.notEqual(repeat.status,200);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM auth_user").first()).count,1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM auth_account").first()).count,1);pass("duplicate identity cannot create duplicate user/account records");
  assert.equal(await (await call("/api/auth/get-session",{headers:{cookie:"better-auth.session_token=forged"}})).json(),null);pass("forged session cookie rejected");
  const hostile=await call("/api/auth/sign-out",{method:"POST",headers:{cookie:fixture.cookie,origin:"https://untrusted.invalid","content-type":"application/json"},body:"{}"});assert.equal(hostile.status,403);pass("untrusted sign-out origin rejected");
  const oauth=await call("/api/auth/sign-in/social",{method:"POST",headers:{origin:"http://localhost:3180","content-type":"application/json"},body:JSON.stringify({provider:"google",callbackURL:"http://localhost:3180/auth/complete",disableRedirect:true})});
  assert.equal(oauth.status,200);const payload=await oauth.json();assert.equal(new URL(payload.url).hostname,"accounts.google.com");
  assert.equal(new URL(payload.url).searchParams.get("redirect_uri"),"http://localhost:3180/api/auth/callback/google");pass("Google authorization URL, callback and OAuth state generated (no real Google authorization)");
  const badCallback=await call("/api/auth/callback/google?code=fake&state=fake");assert.ok(badCallback.status>=300 && badCallback.status<400);assert.match(badCallback.headers.get("location"),/error/);pass("invalid OAuth state rejected");
  const out=await call("/api/auth/sign-out",{method:"POST",headers:{cookie:fixture.cookie,origin:"http://localhost:3180","content-type":"application/json"},body:"{}"});assert.equal(out.status,200);
  assert.equal(await (await call("/api/auth/get-session",{headers:{cookie:fixture.cookie}})).json(),null);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM auth_session").first()).count,0);pass("sign-out deletes D1 session and invalidates old cookie");
  await db.prepare("DELETE FROM auth_verification").run();await db.prepare("DELETE FROM auth_user WHERE id=?").bind(fixture.id).run();
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM auth_account").first()).count,0);pass("local fixture cleanup and account cascade");
  await mkdir("artifacts/google-login",{recursive:true});await writeFile("artifacts/google-login/d1-qa.json",JSON.stringify({at:new Date().toISOString(),checks,realGoogleAuthorization:false},null,2));
}finally{await mf.dispose();}
