import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {WaffoPancake,BillingPeriod,TaxCategory} from '@waffo/pancake-ts';
const filename='.dev.vars';const env=parseEnv(await readFile(filename,'utf8'));
if(env.WAFFO_ENVIRONMENT!=='test'||env.WAFFO_STORE_ID!=='STO_5iFEBLTOBoV0tSNB4jxOTJ')throw new Error('Unexpected test store');
const client=new WaffoPancake({merchantId:env.WAFFO_MERCHANT_ID,privateKey:env.WAFFO_PRIVATE_KEY.replace(/\\n/g,'\n'),environment:'test',fetch:(u,i)=>fetch(u,{...i,redirect:'error',signal:AbortSignal.timeout(25000)})});
for(const [plan,period,amount,introAmount,days] of [['monthly',BillingPeriod.Monthly,'9.90','4.90',30],['yearly',BillingPeriod.Yearly,'89.90','49.90',365]]){
 const key=`WAFFO_${plan.toUpperCase()}_PRODUCT_ID`;
 if(env[key]){console.log(JSON.stringify({plan,id:env[key],existing:true}));continue;}
 try{
 const {product}=await client.subscriptionProducts.create({storeId:env.WAFFO_STORE_ID,name:`AI Metadata Remover Pro ${plan==='monthly'?'Monthly':'Yearly'}`,billingPeriod:period,prices:{USD:{amount,trialAmount:introAmount,taxCategory:TaxCategory.SaaS}},description:`Unlimited daily JPEG/PNG image cleaning, up to 10 images per batch${plan==='yearly'?', up to 30 images per session in three batches':''}. Browser-local processing and ZIP downloads. First purchase USD ${introAmount} for ${days} days, then USD ${amount} per calendar ${plan==='monthly'?'month':'year'} until canceled. Each plan offer once per Google account. WebP inspection only.`,metadata:{app:'ai-metadata-remover',plan,contract:'2026-10-02',trialDays:days},successUrl:'https://aimetadataremover.pro/account/billing?checkout=return'}, {idempotencyKey:`pro-${plan}-20261002`});
 await writeFile(filename,(await readFile(filename,'utf8')).trimEnd()+`\n${key}=${product.id}\n`);env[key]=product.id;
 console.log(JSON.stringify({plan,id:product.id,name:product.name,prices:product.prices,metadata:product.metadata,status:product.status}));
 }catch{console.error(`Failed to configure ${plan}; no credentials printed.`);process.exitCode=1;break;}
}
