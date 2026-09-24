# 政策正式版本准备记录

日期：2026-09-18。状态：本地已修改；未推送、未部署、未提交Waffo复审。

## 用户确认的信息

- 个人入驻，法律姓名：胡晓成。
- 所在地：中国广东深圳；英文 Shenzhen, Guangdong, China。
- 英文页面同时显示 Hu Xiaocheng（拼音）及中文法律姓名，不把产品品牌写成注册公司。
- 客服/隐私邮箱：support@aimetadateremover.pro。
- 不填写虚构的公司注册地址或注册编号。
- 用户指定生效日期为实际正式发布当天。

## 改动

- 新增 src/lib/legal.ts 集中维护运营主体、版本和日期。
- 两页保留 Version 1.0，移除 draft/尚未生效的提示，显示 Effective date 和 Last updated。
- 服务条款填明个人主体，并以中国法律为基础、保留适用的强制消费者权利；不擅自指定仲裁机构。
- 隐私政策首先声明数据处理负责人，更新过时的待确认段落。日志说明仅引述 Cloudflare Workers Logs 的公开3/7天计划规则，不将它表述为所有生产数据的实测保留期限。
- 收费预告继续如实说明订阅尚未开放。政策正式版本不代表已接通收费、取消或账户自动删除。

## 发布时逐步检查

1. 核对当前日期：将 src/lib/legal.ts 的 effectiveDate 与 effectiveDateLabel 设为真正首次部署该正式版本的日期。本地目前预置2026-09-18；如另一天发布必须同步更正，不自动使用每次请求日期。
2. 若日期改变，同步 sitemap 中隐私/条款修改日期，再构建。
3. 经授权提交、合并并部署后，打开正式 /terms 和 /privacy，检查主体、日期、邮箱，以及没有草稿或待确认主体措辞。
4. 确认网站实际生效后，才向 Waffo 发送下方回复。仅本地构建或推送代码不能宣称已经发布。

## 上线验证后可发送的英文回复

Thank you for your feedback. We have finalized and published our Terms of Service and Privacy Policy. Both documents identify the operator as Hu Xiaocheng (胡晓成), an individual based in Shenzhen, Guangdong, China, and display their effective date. We have removed the draft and pending-effectiveness language.

Terms of Service: https://aimetadateremover.pro/terms
Privacy Policy: https://aimetadateremover.pro/privacy

Please review the updated documents. Thank you.

## 依据

- https://docs.waffo.ai/mor/account-reviews/tos#introduction
- https://docs.waffo.ai/mor/account-reviews/privacy-policy#data-controller
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://www.cloudflare.com/policies/privacy/

上述是页面内容修订及复审准备，不是Waffo已批准或全部法律义务已获独立核验的证明。

## 本地验证结果

- 定向 ESLint、Next.js 生产 build、git diff --check 通过。
- 浏览器 1440/390 宽度：两页200，主体中文姓名和所在地正确，生效日期显示，正文不含 draft/awaiting confirmation/must be confirmed/once effective；12节正文与既有政策链接保留，无横向溢出或页面运行时错误。
- 本地预览：http://localhost:3107/terms#scope 、http://localhost:3107/privacy#scope 。
- 未检查本次内容的线上发布，因为尚未提交或部署；不得提前发送“已发布”的复审回复。
