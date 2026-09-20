# 问卷发布与邮件接通

## 当前事实与方案

2026-09-20 已在 Cloudflare 控制台补齐线上 `feedback_submission` 表和索引。用户原先失败的线上表单已提交成功，反馈编号为 `184c4afa-e688-4c86-a97a-24ebb50afa5c`，邮件状态为 `pending`。这证明保存成功，不代表邮件送达。

当前 Cloudflare 控制台要求 Workers Paid 才能开启 Email Sending。为避免购买套餐，继续使用已接入的 Resend，收件地址保持 `support@aimetadateremover.pro`。不改已有 Cloudflare Email Routing。免费额度以 [Resend 官网](https://resend.com/pricing) 为准。

重试和清理现已合并到网站 Worker：`worker.mjs` 保留 OpenNext 页面/API，并每 5 分钟执行反馈维护。无需再单独部署 `aimetadateremover-feedback-delivery`。原独立配置已移除；如其他人曾部署旧 Worker，需要先核实再停用，避免两套维护任务长期共存。

## 一次性开通邮件

1. 打开 [Resend](https://resend.com/)，登录或注册运营者自己的账号。网站访问者不需要 Google 登录。
2. 进入 **Domains → Add Domain**，填写 `notify.aimetadateremover.pro`。这是发信子域名，不需要购买新域名。
3. Resend 给出 DNS 记录后，打开 Cloudflare → `aimetadateremover.pro` → **DNS → Records → Add record**，按它实际显示的类型、Name、Content/Value 添加。值从自己的 Resend 页面复制；保留根域名现有 MX 和 Email Routing。
4. 回 Resend 验证，看到域名 **Verified** 才算完成。仅使用发送能力，不开启接收邮件或打开/点击追踪。
5. 进入 **API Keys → Create API key**，创建仅发送、限于该域名的密钥。不要发在聊天中或提交 GitHub。
6. Cloudflare → **Compute → Workers & Pages → aimetadateremover → Settings → Variables and Secrets**，把下面三项添加为 **Secret** 并保存部署：

| 名称 | 值 |
| --- | --- |
| `RESEND_API_KEY` | 刚创建的 Resend 密钥 |
| `FEEDBACK_FROM` | `feedback@notify.aimetadateremover.pro` |
| `FEEDBACK_TO` | `support@aimetadateremover.pro` |

保留 `AUTH_SECRET`、Google 登录设置和数据库绑定。防刷摘要可复用既有 `AUTH_SECRET`，不要求用户登录。若独立设置 `FEEDBACK_RATE_SECRET`，使用随机服务器端密钥。

## 本地检查与试发

在项目根目录的 PowerShell 运行。3180 已有本地服务时直接打开，不启动第二个同目录服务。

```powershell
npm.cmd run db:migrate:local
npm.cmd run feedback:check -- --local
npm.cmd run dev -- --hostname 127.0.0.1 --port 3180
```

审查地址：`http://127.0.0.1:3180/feedback`。所有题目选填，任意有效一项可提交；失败保留内容。服务端故障显示 Reference，可按编号和 local/production 环境查日志。

要从本机试发，在根目录 `.dev.vars` 保留原配置，只追加同样的三个发信值，再运行：

```powershell
npm.cmd run feedback:mail-test
npm.cmd run feedback:mail-test -- --send
```

第一条只检查配置，不发邮件。第二条只向 `FEEDBACK_TO` 发一封固定测试邮件，不包含用户反馈。输出 ACCEPTED 仅表示提供商接受；必须在实际邮箱找到相同 Reference 才能确认送达。缺少变量时停止补配置；超时结果不确定时先查 Resend 记录和邮箱再重试。

## 正式发布顺序

源码推送后，Cloudflare 的 Build command 使用 `npm run cf:build`，Deploy command 使用 **`npm run cf:deploy`**。不要用裸 `npx wrangler deploy` 绕过检查。必须先配置上述三个 Secret，否则新流程会阻止发布。

`npm run cf:deploy` 依次执行：

1. 检查远程网站 Worker 的发信 Secret 名称和防刷配置，只读名称，不输出值。
2. 检查 OpenNext 构建产物存在。
3. 执行远程数据库迁移。现有问卷表使用 `IF NOT EXISTS`，不会删除数据；迁移工具会登记迁移记录。
4. 验证反馈表所需字段和三个索引齐全。
5. 使用原 OpenNext deploy 命令，同时发布网页/API、定时重试和 90 天清理。

任何一步失败都会停止。如果账号无效或无权限，需要修复负责发布的 Cloudflare 身份，不能改用其他数据库。

只读检查远程结构：

```powershell
npm.cmd run feedback:check -- --remote
```

明确需要补迁移时才加 `--migrate`。本地启动只访问本地数据库，不自动访问生产。

## 发布后验收

1. 打开 **线上** `https://aimetadateremover.pro/feedback`，未登录状态提交测试反馈。
2. 页面显示收到反馈及 Reference 后，在 D1 控制台核对记录：

```sql
SELECT id,status,attempts,provider_id,last_error
FROM feedback_submission
WHERE id='替换为页面显示的反馈编号';
```

3. `pending` 表示等待，`sending` 表示投递中，`sent` 仅表示 Resend 接受，`failed` 需要处理。每 5 分钟定时重试，不依赖用户停留。
4. 检查 Resend 发送记录，再检查 support 转发后的实际邮箱，包含垃圾邮件，找到对应 Reference。
5. 核对需求、职业、年龄、建议和许可。只有用户同意联系且提供邮箱才设置 Reply-To；不自动给填写者发邮件或订阅营销。

## 隐私与故障排查

- 仅点击提交才上传答案；不附带图片、文件名、原始元数据、URL 参数或账号信息。
- 请求体上限 16 KB，主要文本上限 2,000 字符，带同源校验、字段白名单、蜜罐、原子限流和重复提交防护。
- `FEEDBACK_SCHEMA_MISSING` 为缺表或字段；`FEEDBACK_STORAGE_UNAVAILABLE` 为数据库故障；`FEEDBACK_RUNTIME_UNAVAILABLE` 为运行配置缺失。日志只记录类别、环境、Reference，不记录原始异常、SQL 参数、答案或密钥。
- `feedback_delivery_summary` 只含接受、等待、失败数量。`sent` 不等于 Inbox 送达。
- 最多尝试 5 次。首次尝试超过 23 小时的不确定投递停止自动重发；先查提供商状态，不盲目重置所有失败记录。
- 定时任务清理数据库中超过 90 天的反馈；邮箱副本由运营者单独管理。

参考：[Resend 域名验证](https://resend.com/docs/dashboard/domains/introduction)、[OpenNext 自定义 Worker](https://opennext.js.org/cloudflare/howtos/custom-worker)。
