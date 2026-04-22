# Image Edit WebUI

一个轻量、界面美观的 OpenAI 图像 Web UI，基于 **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4** 构建。

支持文生图、图片编辑（含遮罩涂抹）、历史图库、自定义模型，以及任何 OpenAI 兼容端点。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2FYOUR_REPO&env=OPENAI_API_KEY,NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY&envDescription=OpenAI%20API%20Key%20%E5%92%8C%20Supabase%20%E8%BF%9E%E6%8E%A5%E4%BF%A1%E6%81%AF&project-name=image-studio&repository-name=image-studio)

> **一键部署前**：将上方按钮链接里的 `YOUR_USERNAME/YOUR_REPO` 替换为你自己的 GitHub 仓库地址，或查看下方[部署到 Vercel](#部署到-vercel) 章节。

## 功能概览

| 模块 | 说明 |
|---|---|
| 文生图 | `POST /v1/images/generations`，支持预设风格快捷注入 |
| 图片编辑 | `POST /v1/images/edits`，最多 16 张参考图；单图时可用画笔绘制遮罩 |
| 图库 | 所有生成结果自动存入浏览器 IndexedDB，可重用作为编辑输入、下载、删除 |
| 设置 | 管理 API Key、Base URL、自定义模型，一键清空历史 |

## 内置模型

| 模型 ID | 家族 | 尺寸 | 质量 | 编辑 |
|---|---|---|---|---|
| `gpt-image-1.5` | GPT | `auto` / `1024x1024` / `1536x1024` / `1024x1536` | `auto` / `low` / `medium` / `high` | 是 |
| `gpt-image-1` | GPT | 同上 | 同上 | 是 |
| `gpt-image-1-mini` | GPT | 同上 | 同上 | 是 |
| `dall-e-3` | DALL·E | `1024x1024` / `1792x1024` / `1024x1792` | `standard` / `hd` | 否 |
| `dall-e-2` | DALL·E | `256x256` / `512x512` / `1024x1024` | `standard` | 是 |

## 自定义模型

在 **Settings** 页可以添加任意模型 ID，用于调用第三方兼容服务（例如自建 API 网关或本地推理服务）中提供的模型。

每个自定义模型可配置：

- **模型 ID**：发送到上游的 `model` 字段（必填）
- **显示名**：UI 下拉中展示的标签
- **家族**：`custom` / `gpt` / `dalle`（仅用于分类）
- **Sizes / Qualities**：用逗号分隔的可选值列表，以及各自的默认值
- **最大生成数量 n**：1–10
- **Prompt 最大字符数**
- **能力开关**：是否支持 `background` / `output_format` / `input_fidelity` / `style` / 图片编辑

添加后立即在文生图与图片编辑页的模型下拉中以独立的"自定义"分组出现，参数面板会根据其能力自动显示/隐藏对应选项。

> **使用建议**：若你的自建服务返回 `b64_json` 格式、接受与 OpenAI 相同的 JSON body，则把模型 ID 填入即可工作。Base URL 需指向 `/v1` 根路径（例如 `https://my-gateway.example.com/v1`）。

## API Key 管理

两种方式可混用，**前端设置优先于后端环境变量**：

1. **前端**：在 Settings 页输入，保存到浏览器 localStorage。适合个人使用、快速试用。
2. **后端**：在项目根目录创建 `.env.local`：

   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```

   适合公开部署（例如部署到 Vercel），前端不需要再填 key。

Base URL 同理，可在前端覆盖或在 `.env.local` 中配置。

所有 API 调用都经由本项目的 Next.js Route Handler（`/api/generate`、`/api/edit`）转发，浏览器不直接请求 OpenAI，避免 CORS 和 key 泄漏风险。

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # 可选：在此填入 OPENAI_API_KEY
npm run dev
```

访问 <http://localhost:3000>，若未配置后端 key，先去 **Settings** 页填写前端 key 即可开始使用。

## 构建与运行

```bash
npm run build
npm start
```

## 部署到 Vercel

本项目支持一键部署到 Vercel，并通过 **Supabase** 持久化历史记录和图片（Vercel serverless 环境文件系统只读，需外部存储）。

### 1. 创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com) 注册并新建项目
2. 打开 **SQL Editor**，把 [`supabase/schema.sql`](./supabase/schema.sql) 的内容粘贴进去并执行
   - 这会创建 `image_history` 表、`images` 公开 Storage bucket 以及相应权限策略

### 2. 获取 Supabase 连接信息

在 Supabase Dashboard → **Project Settings → API** 中找到：

| 变量 | 位置 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role（Secret，不要暴露给浏览器） |

### 3. 推送代码到 GitHub 并点击部署

1. 把本项目推送到你自己的 GitHub 仓库
2. 将本 README 顶部按钮链接里的 `YOUR_USERNAME/YOUR_REPO` 替换为你的仓库路径
3. 点击 **Deploy with Vercel** 按钮，按提示填写以下三个环境变量：
   - `OPENAI_API_KEY`（可留空，用户可在 Settings 页自行填写）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 4. 完成

部署完成后访问 Vercel 给出的 URL，即可正常使用。历史记录和图片会持久化保存在 Supabase 中。

> **本地开发提示**：不配置 Supabase 环境变量时，项目自动回退到本地 `./data/` 文件系统存储，零配置即可运行。

## 快捷键

- **Ctrl/⌘ + Enter**：在文生图页快速提交

## 目录结构

```
.
├── app/
│   ├── layout.tsx / globals.css     全局布局与主题
│   ├── page.tsx                     文生图首页
│   ├── edit/page.tsx                图片编辑
│   ├── gallery/page.tsx             历史图库
│   ├── settings/page.tsx            设置（Key / Base URL / 自定义模型）
│   └── api/
│       ├── generate/route.ts        代理 /v1/images/generations
│       └── edit/route.ts            代理 /v1/images/edits
├── components/
│   ├── Sidebar.tsx                  左侧图标导航
│   ├── ParameterPanel.tsx           参数联动面板
│   ├── ImageDropzone.tsx            图片拖放上传
│   ├── MaskCanvas.tsx               遮罩绘制画布
│   ├── ResultGrid.tsx               结果与历史展示
│   └── ui/ (Button/Select/Input/Slider/Spinner/Toast)
├── lib/
│   ├── types.ts                     类型定义
│   ├── model-config.ts              内置模型能力 + resolveModelCaps
│   ├── settings.ts                  localStorage 设置
│   ├── storage.ts                   IndexedDB 图片 + 历史
│   ├── openai-client.ts             前端 fetch 封装
│   └── utils.ts                     通用工具
├── .env.local.example
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 数据存储

- **设置（API Key、Base URL、自定义模型）**：浏览器 `localStorage`
- **历史记录（图片 + 元数据）**：根据环境变量自动选择存储后端

| 模式 | 触发条件 | 元数据 | 图片 |
|---|---|---|---|
| **本地文件系统** | 未配置 Supabase 环境变量 | `./data/history.json` | `./data/images/*.png` |
| **Supabase** | 配置了 `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Postgres `image_history` 表 | Storage `images` bucket（公开 CDN） |

前端通过下列 API 读写历史：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/history` | 列出全部历史 |
| `POST` | `/api/history` | 写入一条（含 base64 图片） |
| `DELETE` | `/api/history/<id>` | 删除一条 |
| `DELETE` | `/api/history` | 清空全部 |
| `GET` | `/api/images/<filename>` | 按文件名读取图片（仅本地模式） |

`.env.local` 中的 Key、Base URL、Supabase 连接信息都只保存在服务端；前端 localStorage 中仅保存用户在 Settings 页填写的可选覆盖值。

## 错误排查

- **Toast**：错误 Toast 不自动消失；右上角可点 **复制** 获取完整错误串
- **浏览器 Console**：用关键字 `image-webui` 过滤，可看到 `api-client`、`storage-client`、`result-grid`、`generate-page`、`edit-page` 等模块的标签日志
- **服务端终端**：`npm run dev` 输出中用 `[api/generate]`、`[api/edit]`、`[api/history]`、`[history-store]` 等前缀过滤

## 许可证

MIT
