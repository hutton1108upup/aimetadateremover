# 用户反馈问卷：本地审查与邮件配置

## 本次功能

- 当前英文界面；所有答案选填，任意有效一项可提交，包括只填职业或年龄。
- 全站前台累计 60 秒出现轻邀请；导航不重新计时，后台不计时。
- 真实文件首次发起下载后 3 秒出现结果问卷。单文件、未改动原图和 ZIP 均覆盖；内置演示图片不算真实用户任务。
- 正在处理图片、输入文字、已有原生弹窗时延后邀请。认证、账号、隐私、条款和反馈页不自动邀请。
- 一次浏览会话最多自动邀请一次；关闭后 7 天内不再邀请；当前 `needs-v1` 问卷提交后不再自动邀请。页脚和错误结果中的手动入口始终可用。
- 用户点击 Submit feedback 才发送答案；草稿不远程保存，图片和文件名不附带。
- 成功表示 D1 已保存。邮件由后台独立发送；提供商接受不等于收件箱送达。
- 不新增远程浏览分析或会话录像；当前版本不提供邀请曝光/转化率统计后台。

## 收件邮箱与发信服务

`support@aimetadataremover.pro` 是新站公开客服邮箱；迁移期间继续保留 `support@aimetadateremover.pro` 转发，以接住旧页面、旧外链和历史邮件。发信服务是“替网站自动寄信”的渠道，Cloudflare Email Routing 的收信转发不能替代网站发信。

代码使用 Resend HTTPS 接口，不新增 SDK。当前密钥未配置时，反馈仍保存到本地 D1，等待配置后投递；绝不会伪造邮件成功。生产发布必须先配好下述两个 Worker 的邮件设置并验证收件。

## 本地运行

在项目目录的 PowerShell 中执行：

```powershell
npm.cmd run db:migrate:local
npm.cmd run dev -- --hostname 127.0.0.1 --port 3186
```

1. 打开 `http://127.0.0.1:3186/feedback`，可直接审查完整表单。
2. 打开首页或 `/workspace`，保持前台满一分钟，查看邀请。
3. 用新的无痕窗口选择一张自己的图片、等待检查结束并发起下载，约 3 秒后出现另一种邀请。内置 sample 不触发下载问卷。
4. 点击 Share feedback，检查四个结果选项及随答案变化的追问。
5. 展开补充背景，仅填写一个职业，点击 Submit feedback；看到收到反馈及 reference 才代表数据库保存成功。
6. 页面底部 Share feedback 可主动进入问卷。浏览器每个来源分别保存冷却状态；重复审查自动触发请使用新的无痕窗口。

如本地迁移或 dev 无法启动，停在报错步骤，不执行远程迁移替代本地步骤。

## 接通真实邮件（需网站所有者的 Resend 账号和域名配置）

1. 在 Resend 的 Domains 页面添加你控制的发信域名。把该页面实际显示的 DNS 记录添加到对应域名的 Cloudflare DNS，等待 Resend 显示验证成功。不要替换现有收信转发的 MX 记录；可使用专用发信子域名。
2. 在 Resend 的 API Keys 创建仅用于该域名发信的密钥。
3. 打开项目根目录 `.dev.vars`，保留已有 Google 登录设置，只追加或更新下面四项。密钥不要放进聊天、Git 或任何 `NEXT_PUBLIC_` 变量。

```dotenv
RESEND_API_KEY=填写你的真实发信密钥
FEEDBACK_FROM=填写已通过Resend验证的发信地址
FEEDBACK_TO=support@aimetadataremover.pro
FEEDBACK_RATE_SECRET=填写随机服务器端密钥
```

`FEEDBACK_RATE_SECRET` 未填时复用已有 `AUTH_SECRET`，不修改登录密钥。收件人可换成你直接查看的 Gmail；发件人必须来自已验证域名。

4. 重启本地 dev。提交一条新的测试反馈，检查 support 转发后的实际收件箱（包括垃圾邮件），核对职业、年龄、建议、许可和 reference。
5. 邮件模板仅在用户同意联系时设置 Reply-To；不向填写者自动发送营销或确认邮件。

## 发布时必须一起完成（本次不部署）

网站的 `/api/feedback` 使用既有 AUTH_DB，新增独立表，不修改认证表。即时发送由网站 Worker 执行；失败恢复和 90 天清理由 `workers/feedback-delivery.ts` 的定时 Worker 执行，每 5 分钟运行一次。

发布前应在网站 Worker 和 `aimetadateremover-feedback-delivery` 两处配置相同的 `RESEND_API_KEY`、`FEEDBACK_FROM`、`FEEDBACK_TO`。网站还需 `FEEDBACK_RATE_SECRET` 或既有 `AUTH_SECRET`。远程迁移、密钥设置和部署属于单独发布步骤；不要只部署前端而漏掉定时 Worker。

配置文件：`wrangler.jsonc`（网站）、`wrangler.feedback.jsonc`（邮件重试）。两者绑定同一个 D1 数据库。定时 Worker 不开放公共访问地址。

## 可靠性与运维

- 提交大小上限 16 KB；文本字段最多 2,000 字符；只允许固定字段、分类和粗粒度路径。
- 同源 JSON 请求校验、蜜罐字段、同一来源每小时最多 5 次和全站每小时最多 100 次的数据库原子限流。共享网络可能共享额度，后续可按流量调整。
- 请求使用随机 reference；相同 reference 和相同答案重试只保存一条。相同 reference 携带不同内容返回冲突。
- 后台先保存再寄信。原子认领、超时租约和 Resend 幂等键防止并发重复发送；最多尝试 5 次，首次投递超过 23 小时后不自动重发不确定结果，以免越过提供商的幂等窗口。
- `pending` 是等待发送，`sending` 是已认领，`sent` 只表示提供商接受，`failed` 需要人工查看。不可把 `sent` 当成收件箱送达证据。
- 失败记录保留在数据库；Worker 日志只含错误分类和数量，不含问卷、邮箱、密钥或图片。管理员修复后应先查 Resend 的实际发送状态再决定是否重新投递，不盲目重置所有失败记录。
- 数据库反馈由定时 Worker 按 90 天清理；邮箱副本需要运营者单独清理。隐私页和此文档必须与生产实际一致。

参考：[Resend Send Email](https://resend.com/docs/api-reference/emails/send-email)、[幂等键](https://resend.com/docs/dashboard/emails/idempotency-keys)、[D1 接口](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[定时任务](https://developers.cloudflare.com/workers/configuration/cron-triggers/)。
