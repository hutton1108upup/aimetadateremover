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

- 已通过：原有 108 项测试；新增 17 项订阅/真实 SQLite 测试及 5 项清理与计费协作测试；TypeScript；Next.js production build；WSL OpenNext Cloudflare build。验证摘要和构建记录保存在本地 artifacts 中。
- 已通过：Test Worker 7 项真实 HTTP 反向检查，包括篡改价格、跨站请求、未登录下单、取消他人订单、伪造通知；线上单张预留、完成及重复完成只计一次，余额从 3 变为 2。
- 已通过：真实 Waffo Test 收银台显示 USD 4.99/月、下次计费 2026-10-23、“不会处理真实付款”；生成待付款订单 `ORD_0SFLsIWYIvVFW8uqIvmIzX`，未付款前仍是免费账户，批量任务被拒绝。
- 已通过：Chrome 中内置样图清理、验证、两次下载；下载结果为 68 字节，额度不变，无页面控制台错误。
- 尚待完成：用户确认测试收银台条款后，提交成功/拒付测试、验证真实签名通知入库、会员额度、在线取消及退款。当前没有点击沙箱的最终订阅按钮。
- 尚待完成：Chrome 扩展的本地文件权限目前拒绝自动选择自备测试图片；已准备测试文件但未完成真实选文件的浏览器扣次验证。内置样图和服务器计数分别已验证，不能混写成整条上传/选择流程已通过。
- 尚待完成：发布正式商品、生产通知地址、正式迁移与部署、生产 Google 登录及小额实付验证。
- GitHub 交付使用独立分支 `codex/waffo-subscription-live` 和草稿 PR；付款验收完成前不合并主分支、不部署正式收费。准确提交号以本轮交付回执和 GitHub 分支为准。

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

测试环境操作顺序：先 build → 部署 Test Worker → 配置测试密钥与回调 → 创建测试结账 → 测试付款 → 查看签名通知与账户状态。`scripts/billing-test-live.mjs configure/status/checkout/usage/cancel/evidence` 分别对应这些验收步骤。

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

官方资料：[Waffo 集成指南](https://docs.waffo.ai/zh/integrate/skill)、[通知签名](https://docs.waffo.ai/api-reference/webhooks)、[服务条款参考](https://docs.waffo.ai/mor/account-reviews/tos)、[隐私政策参考](https://docs.waffo.ai/mor/account-reviews/privacy-policy)。具体 API 参数以已安装的 `@waffo/pancake-ts@0.25.0` 类型和实际接口返回核对。
