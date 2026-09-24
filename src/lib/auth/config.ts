export interface AuthEnvironment {
  AUTH_BASE_URL?: string;
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export function resolveAuthConfig(env: AuthEnvironment) {
  const baseURL=env.AUTH_BASE_URL?.trim() || "http://localhost:3180";
  const url=new URL(baseURL);
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(url.username || url.password || url.pathname!=="/" || url.search || url.hash || (url.protocol!=="https:" && !(local && url.protocol==="http:"))) throw new Error("AUTH_BASE_URL must be an HTTPS origin or a local HTTP origin.");
  const secret=env.AUTH_SECRET?.trim() || "";
  const clientId=env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret=env.GOOGLE_CLIENT_SECRET?.trim() || "";
  return {baseURL:url.origin,secret,clientId,clientSecret,ready:secret.length>=32 && clientId.endsWith(".apps.googleusercontent.com") && Boolean(clientSecret)};
}
