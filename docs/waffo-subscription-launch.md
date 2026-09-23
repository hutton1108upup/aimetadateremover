# ImageFinisher 月付订阅接入与验收记录

更新日期：2026-09-23。本文记录实施状态，不把“写了代码”当成“已上线收款”。

## 本次确认的收费规则

- 用户已确认：USD 4.99，按自然月自动续费，不再承诺固定每 30 天。续费日期以 Waffo 返回的当期开始、结束时间为准。
- 未登录：每天 1 张；已登录：每天总计 3 张，包含当前访客已用次数。
- Batch Pro：每天 20 次批量任务，另有每天 3 张免费单张。单张先使用免费额度，用完后使用批量任务额度。
- UTC 00:00 重置，不结转。桌面每批最多 30 张/200 MB，移动端 10 张/100 MB，每张 25 MB。
- 本地处理失败/取消释放预留；成功输出必须确认用量后才能下载；同一结果重复下载不重复计数。网络确认失败保留本标签页结果，使用“Retry usage confirmation”重试。
- 网站内置演示样图免费，不扣用户额度。WebP 只检查，不收费清理。

## 工作目录与分支

实施目录：`D:\1副业\AI产品\AI网站\9月\去AI味综合站\web\.worktrees\subscription-live`。

本地分支 `codex/waffo-subscription-live` 从 `origin/main` 的 `4e2109c` 建立。分支就是本次修改单独保存的一条版本记录。旧 `.worktrees/waffo-payments` 和外层 `codex/skills` 的未提交文件没有并入本次修改。

## 已完成的配置

1. 用户单独授权创建项目专用生产密钥，保存到本地忽略文件及本项目 Cloudflare 加密配置。
2. 首次密钥被页面工具意外显示，已在任何业务使用前撤销。替换密钥通过页面 Download 下载后保存，未把其内容输出到记录。
3. 替换密钥已成功调用生产只读接口；店铺 `STO_5iFEBLTOBoV0tSNB4jxOTJ` 的 `prodEnabled=true`。
4. 生产 Worker `aimetadateremover` 已加密保存 Waffo 配置；`WAFFO_CHECKOUT_ENABLED=false`，没有因配置密钥自动开放付款。
5. 创建 Test 商品 `PROD_6aNZfJdapu5t7jQj3sg4VY`：ImageFinisher Batch Pro，USD 4.99，`monthly`，`saas`。未修改原来的测试商品。
6. 已创建独立测试 D1 `imagefinisher-billing-test`，ID `6eb11432-20ce-4b28-a9c3-a78f7192a6a0`，完成 0001–0003 数据库迁移。正式数据库尚未应用本次迁移。
7. 本任务 Cloudflare 登录单独保存在忽略目录 `artifacts/cloudflare-auth`，未覆盖原来的全局登录。正确账号为 `7fd7ed1128ca3d125feaa279f4d4c547`。
8. 2026-09-23 实际核对 Waffo“通用”页：显示“所有激活步骤已完成 / 您的商店已准备好接收正式付款”。提款账户页已存在一个中国 CNY 支付宝账户，基本身份为胡晓成。没有新增、修改或执行提款；已绑定不代表实际提现到账。
9. Google OAuth 客户端已补充两个确切重定向 URI：`https://imagefinisher-billing-test.duckweed1014.workers.dev/api/auth/callback/google` 和 `http://localhost:3227/api/auth/callback/google`。控制台显示保存成功；原来的 3180 和两个正式域名回调均保留，未轮换密钥或增加 Google 数据权限。

## 代码位置与行为

- `migrations/0003_subscription_billing.sql`：结账记录、订阅状态、通知去重、额度预留和并发锁。避免与已经上线的反馈表迁移 0002 冲突。
- `src/lib/billing/`：配置、官方 SDK 调用、支付核验、账户归属、用量核算、定期补查。
- `src/app/api/billing/`：创建结账、取消续费、查询状态、预留/完成/释放任务、接收验签通知。
- `src/app/account/billing/page.tsx`：账户账单页；价格页接入同一个组件。
- `src/components/tool/use-local-workspace.ts`：检查图片不扣费；清理前预留，失败释放，成功确认后允许下载。
- `worker.mjs`：保留原有反馈邮件定时任务，同时加入订阅补查和数据清理。
- `scripts/billing-test-live.mjs`：只能访问独立 Test Worker 和 Test D1 的验收脚本；测试用户是合成数据，不代表真实 Google 登录验证。

任何浏览器传来的价格、用户 ID 或付款成功回跳都不用于开通会员。结账使用官方 authenticated 流程，将订单绑定服务器提供的账户 ID；用户修改收据邮箱也不会改变订单归属。支付通知先验证 Waffo 签名、环境和店铺，再向 Waffo 查询订单，核对商品、USD 4.99/月、账户 ID 及服务器生成的结账引用。数据库保存成功后才返回通知成功。

图片字节、文件名、原始元数据不传给计费服务。浏览器本地处理不是 DRM：有技术能力的人仍可修改自己的浏览器代码；服务器保护的是正常产品流程的账户权益和计数，不能声称能阻止用户在本地自行处理文件。

## 已验证 / 尚待验证

- 已通过：原有 108 项测试；新增 23 项订阅/真实 SQLite 测试及 5 项清理与计费协作测试，共 136 项；TypeScript；ESLint；Next.js production build；WSL OpenNext Cloudflare build。验证摘要和构建记录保存在本地 artifacts 中。
- 已通过：Test Worker 7 项真实 HTTP 反向检查，包括篡改价格、跨站请求、未登录下单、取消他人订单、伪造通知；线上单张预留、完成及重复完成只计一次，余额从 3 变为 2。
- 已通过：真实 Waffo Test 收银台显示 USD 4.99/月、下次计费 2026-10-23、“不会处理真实付款”；未付款前仍是免费账户，批量任务被拒绝。用户已于 2026-09-23 明确授权“允许接受 Waffo 测试条款并完成沙箱测试，不产生真实扣款”，测试条款确认不再是阻塞项。
- 已通过：官方 Visa 拒绝测试卡付款失败，订单 `ORD_6dH4wclSTlob1MhOgOKH0m` 为 `closed`，未获得 Pro；重试生成新结账，不复用失败订单的链接。
- 已通过：官方 Visa 成功测试卡完成两笔 USD 4.99 沙箱首期付款。订单 `ORD_3jbY5PIxxVwxjEONQlk5lL` 和 `ORD_2R3VssKJiNXwL8I5VVgqxh` 均通过真实 RSA 签名通知开通会员；在点击回跳和调用状态补查之前，直接查询 Test 数据库已见 `active/paid=1`。
- 已通过：Pro 的 20 次批量额度，完成一次变为 19；重复确认不再扣次；重复购买返回 409；取消、恢复、再次取消均完成并收到真实通知，取消后保留已付款当期权限。两笔沙箱订阅均已取消未来自动续费。
- 已通过：真实 Google 账户登录 Test 网站，从账单页勾选月付说明、进入官方沙箱、使用测试卡付款、返回网站显示 Batch Pro 及 3 张/20 次额度，再通过网页“Cancel auto-renewal → Confirm cancellation”停止续费。该次测试订单为 `ORD_1ezr12yfLmmhnCQDfYS1Mo`，界面已显示 `Future renewal is canceled`。此项验证的是 Test 网站，不代表正式网站支付已经上线。
- 已通过：Chrome 中内置样图清理、验证、两次下载；下载结果为 68 字节，额度不变，无页面控制台错误。
- 已通过：沙箱全额退款。工单 `TKT_5fCPACjIrhfzMODb4nUpZm` 于 2026-09-23 20:00:02（中国时间）变为 `succeeded`；付款 `PAY_0q7pyLOe7vjAIjrWMsXgFG` 已退 USD 4.99、`isFullyRefunded=true`；`refund.succeeded` 通知送达 HTTP 200。网站数据库为 `paid=0`，账户恢复 Free account，实际批量请求返回 403。退款只提交过一次，无真实资金流动。
- 尚待完成：官方文档写明测试订阅详情有 “Simulate renewal success/failure”，但本店铺实际详情、列表菜单及刷新后的页面均没有这两个入口，“管理订阅”显示“即将上线”。尚未验证真实周期推进、续费失败和恢复通知；到期模拟也需 Waffo 支持。没有通过修改数据库伪造这些结果。
- 尚待完成：Chrome 扩展的本地文件权限目前拒绝自动选择自备测试图片；已准备测试文件但未完成真实选文件的浏览器扣次验证。内置样图和服务器计数分别已验证，不能混写成整条上传/选择流程已通过。
- 尚待完成：发布正式商品、生产通知地址、正式迁移与部署、生产 Google 登录及小额实付验证。
- GitHub 交付使用独立分支 `codex/waffo-subscription-live` 和草稿 PR；付款验收完成前不合并主分支、不部署正式收费。准确提交号以本轮交付回执和 GitHub 分支为准。

## 沙箱实测发现并修复的问题

1. **失败后不能重新付款**：终止状态的订单即使链接未超时，也改为生成新结账；已用真实拒付后成功下单验证。
2. **不同通知被当成同一条**：Waffo 实际通知正文的 `id` 会复用订单 ID。现对已验签的完整正文计算 SHA-256 作为接收记录键；相同重试去重，取消/恢复等不同通知分别处理。已收到并保存真实 `subscription.canceling` 和 `subscription.uncanceled`。
3. **恢复后再次取消失败**：原来按订单固定的取消请求键会命中 Waffo 旧结果。现在先核对实时状态，需要取消时使用本次动作的新键，再核验结果；已取消时直接确认现状。实际第二次取消返回 200。
4. **不同账户共享付费扣次**：原来计数条件包含访客标识，使同一网络的两个账户互相影响。现在付费批量任务只按账户计数；已登录免费单张计入自己的记录及当前访客使用量，不计入其他已登录账户的记录。真实 SQLite 验证两个付费账户各可使用 20 次，同一账户换设备仍累计计数，退出登录不会恢复访客额度。部署后第二个测试账户从错误的 2 张/19 次恢复为正确的 3 张/20 次；执行自己的首个批量任务后为 3 张/19 次，重复确认不重复扣次。第一个账户在此期间已完成退款，其历史用量仍保留，不再影响第二个账户。

通知记录的 HTTP 200 和数据库会员状态分别检查。`/api/billing/status` 会主动向 Waffo 补查；为了证明是通知自动开通，先执行 `snapshot`（只读数据库），再查 `status`。所有验收订单、付款和退款均为 Test 数据，没有真实扣款。

## 免费 Workers 套餐的实际限制与优化

用户于 2026-09-23 明确选择“暂不开通，继续排查免费方案”。当前账户后台确认为 Workers Free；没有开通 Paid 或新增套餐费用。

真实登录后曾连续出现 `/api/billing/status` 返回 503，Cloudflare 日志为 `exceededCpu`、CPU 10 ms。不能把先前少量请求通过当成免费环境长期稳定。

本次优化按以下顺序执行：

1. `src/lib/auth/core.ts` 按 D1 绑定和认证配置复用 Better Auth 处理器，配置/密钥变化即重新创建。缓存不保存用户会话；真实 workerd/D1 测试覆盖并发两个账户、匿名、伪造 cookie 和退出登录。
2. `src/lib/worker-api.ts` 复用原有登录、账单路由；`worker.mjs` 使用当前固定 OpenNext 版本生成的 `runWithCloudflareRequestContext` 提供请求级环境，直接运行这些接口，避免每个请求经过 Next 页面处理层。现有验签、来源校验、账户归属、D1 锁、反馈任务和页面路由保留。升级 OpenNext 时必须复验此入口。
3. `src/lib/billing/provider.ts` 复用不含买家会话的官方 Waffo 客户端，避免反复解析私钥；每次请求仍由 SDK 独立签名，未缓存订单核验结果来替代支付验签。
4. 公共导航、页脚和账单相关链接设置 `prefetch={false}`。日志确认此前打开账单页会自动预取十多个页面并消耗 CPU；现在只在用户点击时加载对应页面，不改变链接、页面正文或 SEO 信息。

中间版本连续 20 次已登录状态请求通过，但仍捕获到一次付款回跳补查超限。随后加入 SDK 复用并关闭预取；`cd7cbae2-207a-4616-8826-5798159baf2b` 的一轮日志包含 31 次接口请求，0 次 `exceededCpu`、0 次自动预取；20 次连续已登录账单查询全部返回 200，普通热查询大多为 4–7 ms。认证限流随后显式设为开启，避免直达入口依赖页面框架设置的运行模式。

这些是本轮有限样本，不能外推为正式高负载承诺。最终验证以最新 Test 部署的浏览器结果和 `artifacts/waffo-reference/direct-api-cpu.json` 为准；冷启动、支付核验和普通热查询分开记录。12 项真实 workerd/D1 验证、136 项单元测试、类型检查、Lint、Next/OpenNext 构建和 7 项线上反向检查通过。官方限制说明：[Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)。

限流修正后的 Test 版本 `47af72ed-51cc-4fda-9adf-efb83eec9c00`：截至 2026-09-23 20:42，本轮记录 24 次接口请求，0 次 CPU 超限、0 次自动预取，真实浏览器仍显示 Batch Pro 和已取消续费。随后补齐工作台自身链接的禁用预取，最终 Test 版本为 `eeaaa4ed-bcb6-4904-a7c4-50f0b384a4b4`。部分请求 CPU 仍高于 10 ms（上述末尾样本 12–58 ms）但获平台容忍，因此“这轮未报错”不等于所有请求均低于免费上限。正式收费前仍需保留 CPU 稳定性检查，不把自动重试当作扣款成功。生产当前实际承接流量的版本仍为 `7aba1e3e-abf4-4f6c-a416-934fbdc71737`，没有切到本次 Test 代码。

## 用户查看页面的具体步骤

1. 本地端口 3180 在 Windows 保留范围 3115–3214 内，因此未修改系统端口配置，改用 `http://localhost:3227/pricing`。同时可查看 `/terms#fees`、`/privacy#billing`、`/account/billing`，均已验证 HTTP 200。当前本地 Google 回调未针对 3227 验收，不将本地页面可访问当成 Google 登录成功。
2. 也可打开已部署的测试价格页 `https://imagefinisher-billing-test.duckweed1014.workers.dev/pricing`。页面出现 Test checkout 才是测试环境。
3. 打开 `/account/billing` 查看状态。测试脚本使用独立合成账户，普通浏览器不会自动登录到该账户。
4. 正式发布后，从网站右上角 Google 登录，再点 Billing；这里应显示免费剩余额度或 Batch Pro 到期/续费日期。
5. 购买前勾选月付自动续费说明，再点 Subscribe to Batch Pro；收银台必须显示 USD 4.99/月及税费。
6. 取消时点 Cancel auto-renewal，再点 Confirm cancellation；看到 Future renewal is canceled 和本期结束时间，才表示取消已确认。
7. 退款通过页脚客服邮箱提出，写明购买邮箱、订单号和原因，不发送卡号、验证码或图片。

如果希望代理自动选择本地测试图片：在 Chrome 地址栏输入 `chrome://extensions` → 找到 ChatGPT browser extension → 点击“详细信息 / Details” → 打开“允许访问文件网址 / Allow access to file URLs”。本次没有擅自扩大该扩展权限。也可以自行在本地页面点击 Choose images，选择 `artifacts/billing-qa/local-quota-fixture.png`，验证 1 次访客额度从 1 变为 0，再尝试第二张应被限额拦截。

## 维护与密钥操作

不要打开并复制密钥文件给他人，也不要执行 `git add .`。本地 `.dev.vars`、`.env.waffo-production.local` 和 `artifacts/secrets` 均被 Git 忽略。生产密钥仅用于 Waffo API 和项目加密配置。

如需在 PowerShell 检查配置，在上述实施目录执行：

```powershell
$env:XDG_CONFIG_HOME = Join-Path (Get-Location) 'artifacts/cloudflare-auth'
node scripts/waffo-setup.mjs check --production
node node_modules/wrangler/bin/wrangler.js secret list --name aimetadateremover
```

第一条业务命令应显示 `environment: prod`、本店铺 ID、`prodEnabled: true`；第二条仅显示配置名称，不显示密钥值。失败时停止后续发布，不要把密钥粘贴到命令、聊天或 GitHub。

测试环境操作顺序：先 build → 部署 Test Worker → 配置测试密钥与回调 → 创建测试结账 → 测试付款 → 查看签名通知与账户状态。已有环境不用重复执行 `configure`。在实施目录的 PowerShell 中依次执行下面的只读命令：

```powershell
node scripts/billing-test-live.mjs snapshot
node scripts/billing-test-live.mjs provider-snapshot
node scripts/billing-test-live.mjs delivery-status
node scripts/billing-test-live.mjs status
```

1. 第一条查看通知已经写入的数据库状态；第二条查看 Waffo 的订单和退款实际状态。
2. 第三条查看通知送达结果和已提交退款工单；第四条查看网站最终权益（会执行补查）。
3. 独立续费测试账户用 `snapshot --renewal`、`provider-snapshot --renewal`、`status --renewal`。两组测试账户由本地忽略文件区分，不把登录 cookie 输出或提交到 GitHub。
4. 退款验收成功必须同时看到：Waffo 当前期付款 `isFullyRefunded=true`、成功退款通知、网站 `paid=0`、批量任务被拒绝。只看到 `processing` 就停在等待平台处理，不能改数据库开关凑结果。

## 发布门槛

正式发布需先通过 Test 验收，确认页面和条款统一为自然月，确认退款途径和客服邮箱可用，再应用正式迁移、发布生产商品、设置正式通知地址。部署继续使用原有反馈发布检查，不绕过反馈邮件的已有保护。生产 Google 登录、实际银行卡扣款、退款到账是不同验证结果；没有证据不能写成“全链路完成”。

## Waffo 后台锁定旧域名：需要用户接手的步骤

已实际核对：后台网站仍是 `https://aimetadateremover.pro/`，客服邮箱仍是 `support@aimetadateremover.pro`。当前项目网站为 `https://aimetadataremover.pro`。后台提示“店铺已开启生产，网站已锁定”，必须联系客服变更；不能用改本地代码来绕过此限制。店铺展示名已从“测试”改成 ImageFinisher。

1. 在 Chrome 打开 [Waffo 本店铺通用设置](https://pancake.waffo.ai/merchant/dashboard/STO_5iFEBLTOBoV0tSNB4jxOTJ/settings/general)。
2. 在“网站”输入框下面点击“联系客服”。收件人为 `support@waffo.ai`。如果没有打开邮件软件，直接在您入驻 Waffo 的邮箱中新建邮件，填写该收件人。
3. 复制下面的英文主题及正文，发给 Waffo。不要附 API 密钥、银行卡资料或证件照片。
4. 等 Waffo 回复并解锁/完成变更后，重新打开上述通用设置；“网站”必须显示 `https://aimetadataremover.pro/`，域名状态必须显示已验证。把处理结果告诉开发者，再完成正式收款验收。
5. 客服邮箱的变更需要新邮箱收到验证邮件。先确认 `support@aimetadataremover.pro` 能收信，再处理绑定；本次未解绑现有有效邮箱。

主题：`Update the verified website for ImageFinisher — STO_5iFEBLTOBoV0tSNB4jxOTJ`

正文：

```text
Hello Waffo Support,

I operate ImageFinisher as an individual merchant. My store ID is STO_5iFEBLTOBoV0tSNB4jxOTJ.

The store currently lists https://aimetadateremover.pro/ as its verified website. The project's current website is https://aimetadataremover.pro. The dashboard says the website is locked because production is enabled.

Please help update the store website to https://aimetadataremover.pro and let me know what domain-verification steps are required. The product and operator remain the same.

The current product, pricing and policies are available at:
https://aimetadataremover.pro/
https://aimetadataremover.pro/pricing
https://aimetadataremover.pro/terms
https://aimetadataremover.pro/privacy

We are integrating Batch Pro at USD 4.99 per calendar month with automatic renewal until canceled. Please also confirm the process for changing the verified support email to support@aimetadataremover.pro.

Thank you.
```

上述邮件仅准备了草稿，没有代用户发送。

## 沙箱剩余项：给 Waffo 的具体核查内容

在上面的同一封支持邮件中附上下面内容即可；只涉及测试订单，不含密钥或真实卡资料：

```text
We have completed successful and declined sandbox checkout tests, verified signed activation notifications, and tested cancellation, reactivation and cancellation again. A full sandbox refund also succeeded, and our application correctly revoked paid access.

Your Test Mode documentation describes "Simulate renewal success" and "Simulate renewal failure" buttons in the subscription detail drawer. Our store is in Test Mode, but neither button is visible, and "Manage subscription" is marked coming soon. Please enable the supported test flow or provide the current documented procedure. Test subscription ORD_2R3VssKJiNXwL8I5VVgqxh is available; we have canceled future renewal after testing and can reactivate it when the simulation is available. We also need to verify expiry without waiting a full month.

No live payment should be initiated for these tests.
```

收到平台回复后，先在后台确认仍为“测试模式”，再按其有效说明完成周期推进和到期测试；不能拿正式订阅试按钮。参考：[官方 Test Mode 文档](https://docs.waffo.ai/features/test-mode)。

官方资料：[Waffo 集成指南](https://docs.waffo.ai/zh/integrate/skill)、[通知签名](https://docs.waffo.ai/api-reference/webhooks)、[服务条款参考](https://docs.waffo.ai/mor/account-reviews/tos)、[隐私政策参考](https://docs.waffo.ai/mor/account-reviews/privacy-policy)。具体 API 参数以已安装的 `@waffo/pancake-ts@0.25.0` 类型和实际接口返回核对。
