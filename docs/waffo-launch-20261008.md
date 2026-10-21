# Waffo 订阅上线准备（2026-10-08）

本文件记录当前核查结果，优先于旧接入记录中的域名阻塞描述。工作目录：`D:\1副业\AI产品\AI网站\9月\去AI味综合站\web\.worktrees\subscription-live`。代码分支：`codex/waffo-subscription-live`。本轮已更新测试站，没有推送 GitHub、合并 main 或部署正式网站。

## 实际状态

- 生产 API 已确认商店 `STO_5iFEBLTOBoV0tSNB4jxOTJ` 的 `prodEnabled=true`，网站为 `https://aimetadataremover.pro`，客服邮箱为 `support@aimetadataremover.pro`。旧域名解绑不再是阻塞。
- 测试和生产商店展示名称均已改为 AI Metadata Remover；月付/年付商品正式版本已发布，生产 API 金额、优惠期、周期和回跳地址检查通过。正式回调将在最终上线脚本中配置，目前尚未写入。
- 月付 `PROD_0tKW1HnbEM0GFxGExkSdZS`：首期 $4.90 / 30 天，之后 $9.90 / 自然月。
- 年付 `PROD_4QLNcSMxy5OnUCSTVaw9Wn`：首期 $49.90 / 365 天，之后 $89.90 / 自然年。
- 每个 Google 账号月付、年付优惠各一次，退款和取消不重置资格。图片留在浏览器，Pro 每批最多 10 张，年付会话最多 30 张。
- 测试站 `https://imagefinisher-billing-test.duckweed1014.workers.dev/pricing` 能加载套餐、测试提示和 Google 登录入口。
- 正式站购买按钮禁用，计费状态接口未部署。生产 D1 尚无订阅相关表，不能只修改环境开关就开放收款。
- 正式 Worker 的现有 Google、认证、反馈邮件及 Waffo 核心配置名称已核对；未读取或打印远程密钥值。
- 全局 Wrangler CLI 登录属于另一个账号。本项目的独立登录位于忽略目录 `artifacts/cloudflare-auth`，已实测邮箱及账号 ID 正确。上线脚本固定使用此项目登录，拒绝其他账号。

## 本轮验证

153 项单元测试、TypeScript、ESLint、12 项真实本地 workerd/D1 身份检查、WSL Next/OpenNext 构建通过。新增发布保护测试 11 项通过，检查错误账号/商店、旧域名、金额、优惠期、周期、回跳地址及生产操作顺序、备份失败中止、迁移失败中止和开关失败回退等。上线脚本的流程测试使用模拟 CLI 和 API，不代表真的执行过生产部署。

本轮新建两个隔离测试买家，并完成月付 $4.90、年付 $49.90 的沙箱付款。两者的签名通知均在网站主动查询前写入测试 D1。月付模拟续费 $9.90 成功、模拟失败进入 past_due、再次成功恢复；年付模拟续费 $89.90 成功。收到 subscription.payment_succeeded、subscription.renewed、subscription.past_due 和 subscription.recovered 的签名收据，金额与数据库 paid 标记核对通过。

模拟续费按钮在新建的活跃/优惠期测试订单中可用；此前仅检查已取消订单得出的“入口不可用”不再是当前阻塞。平台模拟会把账期推进到未来日期，当前真实日期下不会提前授予未来账期权益。因此使用归档的真实沙箱状态、付款和原订单不可变价格快照，在对应账期时间做只读回放，验证付费期授予权益、欠费拒绝权益、恢复后重新授予、periodEnd 到期拒绝。没有修改服务器时间、订单或数据库来冒充续费，仍未等待自然日历时间到期。

新月付测试订单：`ORD_1giyDevVPtt7GcooL72G7y`；年付：`ORD_4hRwHVlLvtJnpq0rk6xJsu`。验收后都通过网站取消 API 停止未来续费。原测试月付/年付买家的状态查询和批量任务预约、完成、重复完成仍通过；两账号各 7 项线上负向安全检查通过。没有真实扣款。

最新测试部署版本：`1bd12c11-82b1-4979-8ecd-138387a13738`。测试 D1 迁移检查没有待执行迁移，未重复改表。产品及生命周期证据保存在忽略目录 `artifacts/waffo-20261008`。

## 准备正式商品

在 PowerShell 进入本文件开头的完整工作目录，执行：

```powershell
node scripts/waffo-release.mjs check
```

此命令只读，检查测试商品、生产版本、域名和正式回调，不开放结账。下面的商品准备命令已在本轮明确授权后执行成功，无需再次执行：

```powershell
node scripts/waffo-release.mjs prepare-products
```

该命令验证已有测试商品，再将缺失版本发布到生产、将商店展示名称改为 AI Metadata Remover，并写入本地忽略的生产配置文件。不会新建重复商品，不修改商店 ID，不开放网站结账。已存在但与当前规则不符的正式版本会阻止操作，不能静默覆盖。成功标准：两套餐 `productionVerified=true`，`websiteCheckoutActivated=false`。

## 最后的正式上线操作

以下步骤会修改正式网站及生产数据库。本轮尚未执行；应在用户授权、测试验收结束且正式商品准备完成后进行。

1. PowerShell 进入上述完整工作目录，执行 `node scripts/billing-go-live.mjs check`。本轮只读预检已通过，输出 `productsVerified=true`、`checkoutChanged=false`；`productionWebhookConfigured=false` 是最终切换时尚待注册的回调，不代表商品准备失败。脚本固定核对 Cloudflare 账号 `7fd7ed1128ca3d125feaa279f4d4c547`、Worker `aimetadateremover`、D1 `25630523-1dae-4032-b45b-f539622320f2`，检查正式商品、现有认证/邮件配置和构建产物。任一检查失败就停止修复，不运行下一步。
2. 执行下面的唯一切换命令：

```powershell
node scripts/billing-go-live.mjs activate --confirm-production
```

脚本依序：备份生产 D1 → 应用并核对订阅迁移 → 写入正式支付配置且保持结账关闭 → 注册正式签名回调 → 沿用 feedback release guard 部署网站 → 验证正式环境计费接口 → 最后开放结账 → 再读接口确认。不会自动购买或真实扣款；最终开关后的检查失败时尝试自动关闭结账。备份和部署记录在本项目忽略目录 `artifacts/waffo-20261008`。

3. 成功标准：终端出现 `PASS production checkout enabled`；网站 `/api/billing/status` 返回 JSON，`environment=prod`、`enabled=true`、`checkoutEnabled=true`。登录后分别核对月付/年付收银台金额和取消订阅入口。实际付款到账和签名通知仍需一笔明确授权的真实交易来验收。

Waffo 后台的 Test Mode 按钮只切换后台查看环境；它不会部署网站、迁移数据库或切换网站的 API 密钥。不能把该按钮当成本项目的上线按钮。参考官方文档：<https://docs.waffo.ai/features/test-mode>。

## 本轮授权及完成范围

用户已明确确认使用 duckweed1014@gmail.com 的上述商店和 Cloudflare 账号，准备正式商品、统一展示名称、更新测试 Worker 和测试 D1。本轮已完成这些操作并验证。正式网站部署、生产 D1 迁移、正式收款开关及真实交易仍未执行，最终切换脚本由用户决定何时运行；不能用 Waffo 后台的环境查看按钮代替它。
