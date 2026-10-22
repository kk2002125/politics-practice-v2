# 政治理解型刷题：GitHub 独立副本

这是现有政治刷题网站的完整代码副本，保存在所有者 kk2002125 的私有仓库中。原站继续运行，本仓库的更新不会部署或替换原站。

保留 675 题、记忆曲线、掌握程度统计、明日预估复习、错题本、学习记录导入导出、逐题 AI 提问与记忆解析，以及阿里云 CosyVoice v3 Flash 朗读（默认龙硕，只读题干、浏览器音频缓存）。

## 运行与独立部署

需要 Node.js 22，或支持 Docker 的后端托管服务。代码没有第三方运行时依赖。

1. 设置服务端环境变量 `ACTIVATION_CODE`、`SESSION_SECRET` 和 `SITE_ORIGIN`。`SITE_ORIGIN` 为新部署站点的 HTTPS 来源，例如 `https://quiz.example.com`，不含路径。`SESSION_SECRET` 应使用独立的高强度随机值。
2. 运行 `npm run build`、`npm test`、`npm run validate`。
3. 运行 `npm start`，由托管服务提供 HTTPS 并转发到 `PORT`（默认 3000）。健康检查路径为 `/healthz`。

也可以用根目录 Dockerfile 构建镜像，再在部署平台配置上述私密环境变量。真正的激活码和密钥不保存在源码、镜像或本仓库中；本副本不继承原站运行时密钥。

GitHub Actions 自动验证构建、服务端认证、AI 协议、记忆掌握分类、北京时间复习预估和语音转发逻辑。浏览器检查脚本供原开发环境使用，不调用付费模型。

## GitHub Pages 的边界

本项目不是纯静态页面：认证和语音转发需要服务端。GitHub Pages 不能运行 Node.js 或 Worker 后端，因此本仓库不会用静态网页冒充完整上线；须连接支持 Node.js 或 Docker 的托管服务后，才能获得完整可用的新网址。

## 数据与 Key

学习记录、记忆解析和自愿保存的模型 Key 在浏览器中，音频也按浏览器缓存。代码复制不会自动复制任何设备上的私人学习记录。

访问新域名前，请在原站使用“导出备份”，到新站使用“导入备份”。备份不含 API Key，新域名需自行重新填写。原站和副本的数据独立，导入不会修改原站。

核心源码在 `src/`，服务端公共逻辑在 `worker/server-template.js`，`server/index.mjs` 提供独立 Node.js 入口。`worker/index.js` 是构建生成的受保护资源。不要把激活码硬编码到网页，不要提交真实 `.env` 文件。
