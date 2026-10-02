import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { WaffoPancake } from "@waffo/pancake-ts";
const env = parseEnv(await readFile(new URL("../.dev.vars",import.meta.url),"utf8"));
const client = new WaffoPancake({merchantId:env.WAFFO_MERCHANT_ID,privateKey:env.WAFFO_PRIVATE_KEY,environment:env.WAFFO_ENVIRONMENT,fetch:(url,init)=>fetch(url,{...init,redirect:"error",signal:AbortSignal.timeout(25000)})});
const command=process.argv[2]??"schema";
try {
 const query=command==="schema" ? `query { __schema { queryType { fields { name args {name type {name kind ofType {name kind}}} type{name kind ofType{name kind ofType{name kind}}} } } types {name kind inputFields{name type{name kind ofType{name kind}}} fields {name type{name kind ofType{name kind ofType{name kind}}}}} } }` : `query($storeId:String!){ subscriptionProducts(storeId:$storeId){id name billingPeriod status prices{currency priceInfo{amount taxCategory}}} }`;
 const result=await client.graphql.query({query,variables:command==="schema"?undefined:{storeId:env.WAFFO_STORE_ID}});
 if(result.errors?.length)throw new Error(result.errors.map(e=>e.message).join("; "));
 await mkdir(new URL("../artifacts/waffo-reference/",import.meta.url),{recursive:true});
 await writeFile(new URL(`../artifacts/waffo-reference/${command}.json`,import.meta.url),JSON.stringify(result.data,null,2));
 if(command==="schema") {
  const schema=result.data.__schema;
  console.log(JSON.stringify({queries:schema.queryType.fields.filter(f=>/^subscriptionOrders$/.test(f.name)),types:schema.types.filter(t=>/SubscriptionOrder.*Filter|StringFilter/.test(t.name))},null,2));
 } else console.log(JSON.stringify(result.data,null,2));
} catch(error){console.error(error instanceof Error?error.message:'Provider inspection failed');process.exitCode=1;}
