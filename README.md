# 七月播放器

七月播放器是一款本地课程视频播放器，用于管理、观看和学习已经下载到电脑里的课程内容。它支持课程目录导入、播放进度记录、字幕识别、多语言界面以及中英双语字幕显示。

## 主要功能

- 课程目录导入：选择本地课程文件夹后，自动识别章节、视频、字幕和附件。
- 内置视频播放器：支持本地视频播放、播放进度保存、断点续播和字幕切换。
- 中文字幕识别：文件名包含 `zh`、`zh-CN` 等标识时，会自动识别为中文字幕。
- 默认中文字幕：存在中文字幕时，播放器默认优先显示中文字幕。
- 双语字幕：支持 `中英双语字幕`，可同时显示中文和英文字幕。
- 多语言界面：设置页可切换中文、英文和法语。
- 学习进度：记录每节课完成状态，并展示课程整体进度。
- 笔记和书签：可记录带时间点的学习笔记，并收藏常用课程小节。
- 主题模式：支持浅色、深色和跟随系统。

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
