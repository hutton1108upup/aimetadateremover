// @vitest-environment node
import {describe,expect,it} from "vitest";
import {webhookReceiptKey} from "../events";
describe("Waffo lifecycle notification deduplication",()=>{
  const event={id:"ORD_same",eventId:"ORD_same",eventType:"subscription.activated",timestamp:"2026-09-23T11:40:19Z",data:{orderId:"ORD_same"}};
  it("does not confuse activation and cancellation sharing the same order ID",async()=>{expect(await webhookReceiptKey(JSON.stringify(event))).not.toBe(await webhookReceiptKey(JSON.stringify({...event,eventType:"subscription.canceling"})));});
  it("processes later occurrences of the same lifecycle event",async()=>{expect(await webhookReceiptKey(JSON.stringify(event))).not.toBe(await webhookReceiptKey(JSON.stringify({...event,timestamp:"2026-10-23T11:40:19Z"})));});
  it("deduplicates an identical signed-message retry",async()=>{const raw=JSON.stringify(event);expect(await webhookReceiptKey(raw)).toBe(await webhookReceiptKey(raw));});
});
