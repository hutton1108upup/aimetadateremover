# Waffo Pro 月付/年付接入记录

更新：2026-10-02。当前修改在 codex/waffo-subscription-live；目标主分支为 main。正式站尚未切换到这次支付实现。

## 已确认的收费规则

| 项目 | 规则 |
| --- | --- |
| 游客 | 每天1张免费单张清理 |
| Google 登录免费用户 | 每天总计5张，含当前游客当天已用次数；无批量 |
| Pro Monthly | 首次4.90美元使用30天，之后9.90美元/自然月自动续费 |
| Pro Yearly | 首次49.90美元使用365天，之后89.90美元/自然年自动续费 |
| 首购资格 | 每个Google账号月付、年付各一次；取消、退款或切换套餐不重置 |
| Pro 额度 | 无限日图片数量；每批最多10张；年付一次会话最多30张，拆成三批 |
| 格式与数据 | JPEG/PNG清理，WebP只检查；图片不上传；仅计费和任务引用进入后端 |

取消自动续费后可使用至已付费期结束。实际续费时间以 Waffo 的 periodEnd 为准。桌面最多30张、移动端最多10张等浏览器安全限制继续生效。

## 已完成和证据

1. 合并 origin/main 的品牌、工具页和价格设计，保留支付分支的身份核验、签名回调和 CPU 优化。
2. 新增 migrations/0004_pro_plans.sql；只在测试 D1 执行，未改生产数据库。
3. 沙箱月付产品 PROD_0tKW1HnbEM0GFxGExkSdZS；年付产品 PROD_4QLNcSMxy5OnUCSTVaw9Wn。两个产品均在 Test 环境创建，尚未发布生产版本。
4. 月付沙箱付款 ORD_0GQPWQCLF3Wf0JQrSWFxTG：4.90美元成功，2026-11-01到期。年付 ORD_1igJiuTmmWxZUDqKZsp3Ba：49.90美元成功，2027-10-02到期。没有真实扣款。
5. 两个订单的支付通知均在主动查询状态之前写入测试数据库。月付已用优惠、年付未用优惠相互独立；另一个年付测试账号的结果相反。
6. 两个测试订单都已取消未来续费。重新查询后仍 paid=1、unlimited=true；10张批量预约、完成和重复完成请求成功。
7. 修复 Waffo 两处状态差异：已付费优惠期为 trialing；取消后 isInTrial 会变 false，不能因此收回已付费权益。按订单价格快照、期数、实际成功付款与退款状态核验。
8. 153项单元测试、12项真实 workerd/D1 认证检查、TypeScript、ESLint、Next/OpenNext构建通过。7项在线负向检查通过；连续20次登录状态请求均200。这不是生产负载或免费CPU额度的保证。
9. 退款后月付重购收银台显示9.90美元，订单ORD_3hRIXpSoVUi1BoIXxjRo0A沙箱付款成功，Pro权益恢复；月付优惠仍不可重复领取。该新订单也已取消未来续费，付费访问至2026-11-02。
10. 浏览器重新完成真实Google登录，并查看账户账单。新月付/年付付款使用隔离的测试账号；没有把这两类证据混为同一个账号的端到端测试。

测试版本：bfa4bb48-1c1a-4dc3-9ea4-972337b73207（后续若部署更新，以部署日志为准）。测试网址：https://imagefinisher-billing-test.duckweed1014.workers.dev/pricing
本地证据保存在忽略目录 artifacts/waffo-20261002；不提交凭据、Cookie、收银台令牌或用户私有记录。

## 尚未完成的发布条件

1. Waffo生产API和General仍显示旧网址 https://aimetadateremover.pro/ ，且字段锁定。客服须先释放旧绑定。support@aimetadataremover.pro 已验证，不要重复解绑邮箱或改DNS。
2. 订阅详情的“管理订阅即将上线”仍为禁用；未发现即时模拟续费按钮。因此真实沙箱续费、失败后恢复、自然到期仍未验证。月付4.90美元首期全额退款已实测：退款通知先将paid变为0，随后状态回到免费账号，批量请求403，月付优惠仍已使用、年付优惠仍可用。
3. 正式商品发布、生产D1迁移、正式站计费部署与开关尚未执行。不能把Test付款成功写成正式收款已经开通。

## 后续执行步骤（沿用已批准账号，无需再次确认相同资源）

1. 在Chrome打开 Waffo 店铺 STO_5iFEBLTOBoV0tSNB4jxOTJ 的 Settings → General。客服释放后，填写 https://aimetadataremover.pro/ 并使用同域名邮箱的一键 Verify domain。成功标准：页面和生产API均显示新网址已验证。客服明确无需重提整份KYB，域名核验不会暂停生产资格。
2. 使用上述Test商品完成剩余退款/续费验收。没有平台支持的模拟入口就如实保留未验证状态，不通过直接修改订单数据库冒充续费结果。
3. 在Waffo发布两个已验收的商品版本，重新读取生产金额、trialAmount和trialDays；将正式商品ID写入该项目Cloudflare加密配置。此时保持 WAFFO_CHECKOUT_ENABLED=false。
4. Windows PowerShell进入本工作目录，先执行 npm.cmd run lint、npm.cmd run typecheck、npm.cmd test、npm.cmd run test:auth-d1；WSL执行 bash scripts/rebuild-billing-wsl.sh。任一步失败就停在该步修复，不能跳过。
5. 备份生产D1后依序执行0003、0004迁移；仅使用已批准账户和生产数据库25630523-1dae-4032-b45b-f539622320f2。核对表和索引存在后，再按现有 npm run cf:deploy 反馈系统发布检查部署，不绕过release guard。
6. GitHub上的PR17源分支是codex/waffo-subscription-live，目标main。推送只是把代码备份到GitHub；合并main和生产部署另行记录。生产条件未满足时保留Draft，不提前宣称上线。
7. 最后核对正式域名、Google登录、套餐金额、Webhook回调、取消入口和原有反馈功能，再开放正式结账。禁止用真实扣款作为本轮测试；不升级Cloudflare付费套餐。

## 手动复查测试环境

在本项目 subscription-live 工作目录的PowerShell中：

```powershell
node scripts/billing-test-live.mjs status --pro
node scripts/billing-test-live.mjs status --pro --yearly
node scripts/billing-test-live.mjs checks --pro
```

成功标准：状态请求返回200；年付测试账号will_renew=0且仍有当期权益。月付账号已验证退款后的撤权，后续重购以最新订单为准。负向检查输出passed=7。测试会话只有一天有效，过期需重新创建测试会话，不能把401当成支付失败。
