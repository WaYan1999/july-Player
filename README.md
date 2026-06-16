# 七月播放器

七月播放器是一款本地课程视频播放器，用于管理、观看和学习已经下载到电脑里的课程内容。它支持课程目录导入、播放进度记录、字幕识别、多语言界面、中英双语字幕显示、清晰度转换以及 DeepSeek AI 翻译。

## 主要功能

- 课程目录导入：选择本地课程文件夹后，自动识别章节、视频、字幕和附件。
- 内置视频播放器：支持本地视频播放、播放进度保存、断点续播和字幕切换。
- 中文字幕识别：文件名包含 `zh`、`zh-CN` 等标识时，会自动识别为中文字幕。
- 默认中文字幕：存在中文字幕时，播放器默认优先显示中文字幕。
- 双语字幕：支持 `中英双语字幕`，可同时显示中文和英文字幕。
- AI 翻译：应用页可配置 DeepSeek，播放器内可打开 AI 翻译面板，优先实时翻译当前字幕。
- 清晰度选择：播放器支持 1080P 和 2K 选择，低分辨率视频可转换并缓存为更高清版本。
- 多语言界面：设置页可切换中文、英文和法语。
- 柔和无边框窗口：Windows 使用自定义标题栏，颜色跟随主题，logo 背景透明。
- 学习进度：记录每节课完成状态，并展示课程整体进度。
- 笔记和书签：可记录带时间点的学习笔记，并收藏常用课程小节。
- 主题模式：支持浅色、深色和跟随系统。

## 1.1.1 新增修改

- 新增 Windows 无边框窗口模式，移除系统白色标题栏。
- 新增柔和自定义标题栏，标题栏颜色跟随深色/浅色主题。
- 新增自定义窗口按钮：支持最小化、最大化/还原和关闭。
- 优化标题栏按钮反馈：默认低对比，鼠标悬停时显示柔和反馈。
- 优化七月播放器 logo，去除图标四周白色背景，并同步桌面打包图标。

## 1.1.0 新增功能

- 新增 AI 模块：支持配置 DeepSeek API Key、模型和翻译目标语言。
- 新增播放器 AI 翻译面板：字幕旁边可打开 AI 翻译，没有配置 DeepSeek 时会引导到 AI 模块。
- 优化字幕翻译逻辑：有字幕轨时优先翻译当前字幕，避免字幕空档误触发音频识别。
- 优化 AI 配置反馈：改为保存配置按钮，测试翻译前会先保存未保存配置。
- 优化 DeepSeek 请求：增加请求超时、输入长度限制和更清晰的错误提示。
- 保留 1080P / 2K 清晰度选择与低分辨率视频转换缓存能力。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript |
| 路由 | React Router 7 |
| 样式 | Tailwind CSS v4 + shadcn/ui + Radix UI |
| 后端 | Rust |
| 数据库 | SQLite |
| 构建工具 | Vite |

## 本地开发

### 环境要求

- Node.js 20 或更高版本
- Rust 稳定版
- 当前系统对应的 Tauri 构建环境

### 安装依赖

```bash
npm install
```

### 启动开发模式

```bash
npm run tauri dev
```

### 打包当前系统安装包

```bash
npm run tauri build
```

Windows 打包产物通常位于：

```text
src-tauri\target\release\bundle\
```

macOS 打包产物通常位于：

```text
src-tauri/target/release/bundle/
```

## macOS 打包说明

macOS 安装包需要在 macOS 系统或 GitHub Actions 的 macOS runner 上构建。Windows 本机不能直接生成 `.dmg`。

项目已有 GitHub Actions 构建配置，可在 GitHub 仓库的 Actions 页面触发 macOS 构建。

## 项目结构

```text
ckourse/
├─ src/                 # React 前端代码
│  ├─ components/        # 页面组件和播放器组件
│  ├─ pages/             # 页面路由
│  ├─ hooks/             # React hooks
│  ├─ lib/               # 状态、工具和常量
│  ├─ assets/            # 图标和静态资源
│  └─ types/             # TypeScript 类型
├─ src-tauri/            # Tauri / Rust 后端代码
│  ├─ src/               # Rust 命令、数据库和解析逻辑
│  └─ tauri.conf.json    # Tauri 配置
└─ public/               # 公共静态资源
```

## 仓库

当前维护仓库：

[https://github.com/ShowSnowBlood/july-Player](https://github.com/ShowSnowBlood/july-Player)

## 许可证

MIT
