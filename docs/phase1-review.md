# Phase 1 优化验收记录

日期：2026-09-08。分支：codex/gefeiSEO。范围：本地实现和验收；未提交、推送或部署。

## 本地审查

- 首页：http://127.0.0.1:3173/
- 完整工作台：http://127.0.0.1:3173/workspace
- 工作台与本地漏斗日志：http://127.0.0.1:3173/workspace?review=1
- 检测页：http://127.0.0.1:3173/metadata-checker
- PNG 清理页：http://127.0.0.1:3173/remove-metadata-from-png
- 隐私说明：http://127.0.0.1:3173/privacy
- 更新的指南：http://127.0.0.1:3173/guides/image-metadata-before-publishing
- Sitemap：http://127.0.0.1:3173/sitemap.xml

选择真实图片或 Try a safe sample → Clean → 选择模式 → Clean all supported files → 查看 Removed / Preserved / Unresolved → 下载单张或 ZIP。示例与真实文件的漏斗记录分开；重复下载同一输出只计一次下载动作，浏览器动作不等于用户已经保存成功。

## 实现

- 批量清理、嵌入式工作台文件切换、队列清空、取消任务、单任务超时、文件/总大小/像素上限、失败结果失效。
- 重复清理先释放旧 Blob URL 和输出缓冲区。删除/退出销毁 Worker；主动分离 ArrayBuffer，避免 React 上轮渲染引用继续占用大块数据。
- ZIP 对重名文件加序号，防止覆盖。ZIP 失败可改用单文件下载。
- 复检以实际编码图像数据比较为证据，另外核验方向、尺寸、ICC、透明度，并验证浏览器解码。
- Privacy Clean 开放支持的 EXIF GPS、日期、设备身份、MakerNote 和 JPEG 缩略图清理；保留版权、方向。嵌套 SubIFD、strip/tile 缩略图、重叠或异常 EXIF 拒绝处理。XMP/IPTC/压缩文本等未处理内容明确标为需要复核；不承诺删除全部隐私信息。Full Clean、WebP 清理仍关闭。
- PNG 支持范围测试通过后，本地版本解除 noindex，并进入 9 条公开 URL 的 sitemap。工作台保持 noindex。没有新增视觉修复页面。
- 漏斗只使用枚举及数量/大小/耗时区间，排除文件名、图片、Prompt、GPS、哈希和原始元数据；最多 200 条，仅存页内存。可通过 imagefinisher:funnel CustomEvent 接入经过审核的接收端。本地 review 面板仅在 localhost/127.0.0.1 的 ?review=1 下显示。

## 验证证据

- npm.cmd run build：通过。
- npm.cmd run typecheck：通过。
- npm.cmd run lint：通过。
- npm.cmd run test：14 个文件、49 项测试通过。
- BASE_URL=http://127.0.0.1:3173 下运行 scripts/browser_qa.mjs：10 条路由及 375/390/768/812 横屏/1024/1440 断点通过；无控制台错误。
- scripts/workspace_qa.mjs：17 组浏览器检查通过；30 张桌面/10 张手机模拟各三轮、重复清理、取消恢复、真实 JPEG/PNG 隐私清理与下载、WebP 混合队列、ZIP 数量和图像数据比较、像素上限、195 MB/95 MB 大批次。
- 大批次清空后，CDP backing storage：桌面约 196.02 MB → 0.75 MB，手机模拟约 95.81 MB → 0.72 MB；Blob URL 与 Worker 计数归零。这里测量的是 Chromium 内存指标，不是全部系统/GPU 内存，也不代表所有真机均已测试。
- 处理阶段网络白名单审计包含 GET URL、请求体及 WebSocket；没有图片/元数据/文件名外发或 API 写请求。
- scripts/seo_qa.mjs：本地 canonical、robots、sitemap 和索引边界通过，线上状态独立保存。

证据位于 artifacts/phase1-review/：workspace-qa.json、seo-qa.json、desktop-verified.png、mobile-verified.png 和预览日志。生成测试图片均为人工合成数据。

## 外部待办

1. GSC：当前登录账号没有 sc-domain:aimetadateremover.pro 的访问权限；可见资源列表中也没有本站。提交状态、收录及搜索词均未核验，未添加或修改 GSC 属性。
2. 线上漏斗：未提供 GA4/Plausible 等接收端配置，目前只完成本地事件及接入接口；没有真实线上汇总统计。
3. 生产版本尚未更新：此次 PNG 可索引和 Privacy Clean 等变化仅在本地预览中生效。
