# Google 登录：本地演示配置与验收

## 当前状态（2026-09-17，上线准备）

- 真实 Google 首次登录、退出、再次登录、刷新完成页恢复会话均已通过。退出后本地 D1 有效会话数为 0；再次登录后仍为 1 个用户、1 个 Google 账户、1 个有效会话，没有重复注册。
- 原工作台没有刷新，示例图片和清理结果仍保留。
- 当前主干为 `ee36205`，本分支以它为基线；68 项测试、lint、类型检查、新的 Next/OpenNext 构建和 Wrangler dry-run 已通过。构建产物 1301 个文件中未发现本地 AUTH_SECRET 或 Google Client Secret。
- 用户已授权将登录功能部署上线，支付继续排除。生产 D1 `aimetadateremover-auth` 已创建，四张认证表迁移成功，三项 Worker secrets 已配置；**新代码尚未部署**。
- 生产域名迁移目标为 `https://aimetadataremover.pro`，对应 Google 生产回调为 `https://aimetadataremover.pro/api/auth/callback/google`。切换前须先把新来源与精确回调加入现有客户端，并暂时保留旧域名回调作为回滚通道。本地来源仍为 `http://localhost:3180`，本地回调不变。
- 账号已核实：线上账号 ID 为 `7fd7ed1128ca3d125feaa279f4d4c547`，Worker 为 `aimetadateremover`。项目内 `.wrangler/prod-config` 的 Wrangler OAuth 已获用户授权，全局其他项目的登录保持不变。

下方早期“无凭据”“不部署”等描述是各次验收时的历史记录，以本节当前状态为准。

## 已选方案

- 基于 origin/main 的独立分支 codex/google-login。
- 现有 Next.js 16.3.4 / OpenNext 1.20.6 不变。
- Better Auth 1.7.3、对应 Drizzle adapter 1.7.3、Drizzle 0.45.2；仅 Google。
- MkSaaS 复用来源为 src/lib/auth.ts、auth-client.ts 和 social-login-button.tsx 的认证/交互模式；重写 D1 schema、请求级实例、弹窗和会话隔离。未引入模板后台、营销订阅或支付代码。
- D1 绑定 AUTH_DB，四张 auth_* 表。生产数据库 ID 为 `25630523-1dae-4032-b45b-f539622320f2`；`preview_database_id` 保留原本地模拟数据库 ID，且 `remote:false`，本地开发不连接生产用户数据。
- Better Auth 适配器 transaction:false 符合 D1 不支持交互式事务的约束；不能据此宣称未来订单写入具备原子性，支付阶段需使用 D1 batch 与唯一约束。

## 创建 Google 演示 OAuth 应用

1. 打开 [Google Auth Platform](https://console.cloud.google.com/auth/overview)，创建或选择独立演示项目，例如 `AI Metadata Remover Demo`。
2. 配置 Branding：应用名填 `AI Metadata Remover Demo`，支持邮箱与开发者联系邮箱选自己的邮箱。Audience 选择 External，演示期间保持 Testing，并将自己准备登录的 Google 账号加入 Test users。
3. 在 Clients 创建 Web application OAuth client，例如命名为 `Local Demo`。
4. Authorized JavaScript origin 填 `http://localhost:3180`。
5. Authorized redirect URI 精确填写 `http://localhost:3180/api/auth/callback/google`。
6. 创建后立即下载客户端 JSON，保存在项目目录以外，例如下载文件夹。Secret 可能仅在创建时可查看或下载。把 JSON 的本地文件路径告诉 Codex 即可，不需要在聊天粘贴 Secret。Codex 会使用下面的导入命令写入本 worktree 的 `.dev.vars`；已有 `AUTH_SECRET` 保留。
7. Codex 导入配置并重启本地预览后，你在原工作台右上角点击 Sign in，在独立窗口选择自己的 Google 账号并授权。密码、二次验证和授权确认由你完成。

不要混用 localhost 与 127.0.0.1，也不要将生产 SEO canonical 作为本地 AUTH_BASE_URL。换端口时同时修改认证 origin、Google redirect URI 和预览端口。无需申请 Gmail、Drive 等权限，仅使用 openid/email/profile。

上述客户端类型、下载凭据和本地回调要求依据 [Google OAuth 官方文档](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)；本项目回调路径对应 [Better Auth Google 文档](https://better-auth.com/docs/authentication/google)。

## 生产配置

`wrangler.jsonc` 的 AUTH_BASE_URL 为 `https://aimetadataremover.pro`；本地 `.dev.vars` 用 `http://localhost:3180` 覆盖它。生产 AUTH_SECRET 与本地密钥不同，Google Client ID / Secret 和生产 AUTH_SECRET 均通过 Worker secrets 注入，不能使用 `NEXT_PUBLIC_*`。本地恢复副本 `.dev.vars.production` 被 Git 及 WSL 构建排除，不要提交。

生产迁移只针对明确授权的账号执行：`wrangler d1 migrations apply AUTH_DB --remote`。本地继续使用 `npm run db:migrate:local`。项目专用 CLI 授权需在当前终端设置 `$env:XDG_CONFIG_HOME=Join-Path $PWD '.wrangler/prod-config'`。

当前仅申请 `openid/email/profile`。External 类型的 Google 应用只使用这些基本身份权限时，不要求每个登录用户都在测试名单中；企业 Google Workspace 管理员仍可施加限制。参见 [Google 用户范围说明](https://support.google.com/cloud/answer/15549945?hl=en)。

## 本地配置命令

在 `web/.worktrees/google-login` 目录执行：

```powershell
npm.cmd run auth:import -- "C:\Users\你的用户名\Downloads\client_secret_你的客户端.json"
npm.cmd run auth:check
```

导入只读取你指定的 JSON，校验 Web 客户端和精确回调地址；不会打印凭据，不会替换已配置为其他值的 Client ID / Secret，不会轮换已有 AUTH_SECRET。`.dev.vars` 未被 Git 忽略时拒绝写入。缺少 OAuth 凭据时自检返回非零状态，这是尚未配置的结果。

启动预览后执行 `npm.cmd run auth:check -- --live`，检查本地认证是否启用及响应是否禁止缓存。此检查不证明 Google 认可凭据，也不代表真实授权已通过。

如果 Windows 沙箱限制 Wrangler 写入用户配置目录，可仅为当前终端指定项目内目录：

```powershell
$env:XDG_CONFIG_HOME=Join-Path $PWD '.wrangler/local-config'
$env:WRANGLER_SEND_METRICS='false'
```

再执行本地迁移或预览命令；不需要修改系统权限。

## 本地运行

```powershell
npm.cmd install
npm.cmd run cf:typegen
npm.cmd run db:migrate:local
npm.cmd run dev -- --hostname 127.0.0.1 --port 3180
```

常规构建：`npm.cmd run build`。Workers 打包：`npm.cmd run cf:build`。原生 Windows 的 OpenNext 打包若提前退出，使用已准备的 WSL 脚本：

```powershell
wsl.exe --exec bash scripts/build-auth-wsl.sh
npm.cmd run cf:preview -- --port 3180 --ip 127.0.0.1
```

WSL 使用独立 Linux 临时目录和 npm 10.9.4 安装/构建，不复制 `.dev.vars` 或 `.env*`。成功后同步兼容 lockfile 和 `.open-next` 构建输出。它不会部署 Worker 或迁移远端数据库。

## 验收边界

2026-09-17 当前进展：已从用户指定的本地 JSON 导入 Google 凭据，保留原 AUTH_SECRET；`auth:check -- --live` 全部通过，本地 D1 迁移无待执行项。真实 Google 登录入口已显示应用“谷歌测试”的账号输入页，等待用户登录/授权。尚未验证授权码交换、真实账户写入及登录后的退出流程。工作台已放入并清理安全示例图，供授权后检查队列/结果保留。仓库中另有一份客户端 JSON，已加入 Git 忽略和 WSL 构建复制排除规则，没有提交。

同日首次真实授权返回 `invalid_code`：定位为受限进程环境下 workerd 无法访问 Google token endpoint。同一最小探针在沙箱中返回网络 internal error，在获准的非沙箱进程中返回 Google HTTP 400 / `invalid_grant`（使用刻意无效的测试码；不代表真实授权成功）。已在非沙箱进程重启仅监听本机 3180 的 Workers 预览；用户需重新发起一次授权，不能重放之前的回调 URL。没有关闭 TLS 校验，没有修改系统代理，没有改生产配置。

- `npm.cmd run test:auth-d1`：独立本地 workerd + D1 的真实 schema、OAuth account/session CRUD、签名 Cookie、伪造会话、来源校验、OAuth URL/state、退出和清理测试。测试 worker 不属于应用入口。
- `npm.cmd run test:auth-browser`：匿名/缺配置路径、移动端布局、图片处理回归；另含明确标注的 UI fixture，用于验证弹窗、会话刷新和退出不清空图片，不代表真实 OAuth 成功。
- `npm.cmd run test:e2e`、`node scripts/workspace_qa.mjs`：原有公开路由和本地图片隐私检查。只对白名单认证读取请求放行，不允许任意 API 或图片外发。
- Google OAuth 配置现已导入。Google 实际授权、首次真实注册、真实账号重复登录及退出后的重新登录，仍须在用户完成账号授权后验收。
- 第一阶段不赠送积分、不实现 Stripe、不上传图片、不创建远端 D1、不推送或部署。

## 本轮本地验证（2026-09-09）

- 单元测试：16 个文件、61 项通过；类型检查与 lint 通过。
- D1：真实本地 workerd 的 9 项检查通过；没有连接远端数据库。
- 构建：Next 常规 build 通过；原生 Windows OpenNext 提前退出，WSL OpenNext 构建通过，已生成 `.open-next/worker.js` 并启动本地 Workers 预览。
- 浏览器：公开路由、390 / 768 / 1440 宽度认证布局、匿名扫描清理下载通过。桌面 30 张与移动端 10 张图片各循环 3 轮，另验证 195 MB / 95 MB 批次、取消恢复、ZIP 和资源释放。
- 图片隐私检查通过。成功登录状态的浏览器交互只使用明确标注的 UI fixture；不能替代 Google 真实授权验收。
- 审查入口：`http://localhost:3180/workspace`、`http://localhost:3180/auth/start`、`http://localhost:3180/privacy`。
- 测试记录：`artifacts/google-login/d1-qa.json`、`artifacts/google-login/browser-qa.json`、`artifacts/phase1-review/workspace-qa.json`。

## 工程兼容性说明

2026-09-16 补充：已加入 `auth:import`、`auth:check`、`test:auth-setup`。凭据仍未提供；实际 Google 授权继续列为待验收，不进入支付阶段。本轮仅增加本地配置辅助工具与文档，应用预览复用 2026-09-09 的 OpenNext 构建产物。

本次复核结果：配置工具 7 项测试、认证单元测试 12 项、真实 workerd D1 9 项检查、认证浏览器回归、lint 和类型检查均通过。本地迁移无待执行项；`auth:check -- --live` 如实报告两个 Google 凭据缺失，预览中的认证尚未启用。

Better Auth 的可选 Vitest peer 范围未覆盖本项目 Vitest 5；采用仅针对该可选测试 peer 的 npm override，保留项目测试框架，没有使用全局 legacy-peer-deps。
Wrangler 生成的 Workers DOM 类型与浏览器 append 重载重名，原本地下载辅助函数改用等价的 appendChild。
认证 API 与完成页设置 no-store / noindex；受保护的 /api/account 在服务端验证真实会话。只在 Google 登录窗口跳转，原工作台不刷新；消息只用于触发服务器会话查询，不承载令牌。
