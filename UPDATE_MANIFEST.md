# 七月播放器远程更新 latest.json 说明

七月播放器使用 Tauri Updater 做远程更新。后台不负责生成签名，后台只负责托管安装包、托管 `.sig` 文件，并把 `.sig` 文件内容写进 `latest.json` 的 `signature` 字段。

## 1. 签名文件来源

`.sig` 是 Tauri 客户端项目打包时生成的签名文件，不是 WordPress 后台生成的，也不是后端接口生成的。

第一次生成 Tauri updater 密钥：

```powershell
pnpm tauri signer generate -w "$HOME\.tauri\july-player.key"
```

如果本地使用 npm，也可以运行：

```powershell
npm run tauri -- signer generate -w "$HOME\.tauri\july-player.key"
```

生成后会得到：

```text
july-player.key
july-player.key.pub
```

把 `.key.pub` 文件内容配置到播放器客户端的 `src-tauri/tauri.conf.json`：

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "这里放 .key.pub 文件内容"
    }
  }
}
```

当前项目已经配置了：

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://julyres.top/july-player/latest.json",
        "https://github.com/WaYan1999/july-Player/releases/latest/download/latest.json"
      ]
    }
  }
}
```

## 2. 每次打包前设置私钥

本地打包前设置环境变量：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="$HOME\.tauri\july-player.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="你的密钥密码"
pnpm tauri build
```

如果使用 npm：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="$HOME\.tauri\july-player.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="你的密钥密码"
npm run tauri -- build
```

GitHub Actions 需要配置仓库 Secrets：

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

如果密钥没有密码，`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 可以为空；如果密钥设置过密码，这个 Secret 必须配置。

## 3. 打包产物和 .sig 必须一一对应

打包完成后，Tauri 会在安装包旁边生成 `.sig`：

```text
src-tauri/target/release/bundle/msi/xxx.msi
src-tauri/target/release/bundle/msi/xxx.msi.sig

src-tauri/target/release/bundle/nsis/xxx-setup.exe
src-tauri/target/release/bundle/nsis/xxx-setup.exe.sig

src-tauri/target/release/bundle/macos/xxx.app.tar.gz
src-tauri/target/release/bundle/macos/xxx.app.tar.gz.sig
```

注意：

- `.sig` 必须和安装包来自同一次构建。
- 不能混用旧 `.sig`。
- 如果替换了 `_1.1.4_x64_zh-CN.msi`，必须同时替换这次构建生成的 `_1.1.4_x64_zh-CN.msi.sig`。
- `latest.json` 里的 `signature` 必须是 `.sig` 文件内容，不是 `.sig` 路径，也不是 `.sig` 下载 URL。

## 4. 后台需要做什么

后台只做三件事：

1. 上传安装包。
2. 上传对应的 `.sig` 文件，方便人工核对和下载。
3. 读取 `.sig` 文件内容，写入 `latest.json.platforms[平台].signature`。

后台不要自己计算 MD5、SHA256，也不要自己生成签名。

## 5. latest.json 标准格式

`GET https://julyres.top/july-player/latest.json`

推荐返回：

```json
{
  "version": "1.1.8",
  "notes": "七月播放器 1.1.8 更新说明：\n- 优化远程更新\n- 修复已知问题",
  "pub_date": "2026-06-17T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.8_x64_zh-CN.msi",
      "signature": "这里放 .msi.sig 文件里的完整内容"
    },
    "windows-x86_64-msi": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.8_x64_zh-CN.msi",
      "signature": "这里放 .msi.sig 文件里的完整内容"
    },
    "windows-x86_64-nsis": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.8_x64-setup.exe",
      "signature": "这里放 .exe.sig 文件里的完整内容"
    },
    "darwin-aarch64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.8_universal.app.tar.gz",
      "signature": "这里放 .app.tar.gz.sig 文件里的完整内容"
    },
    "darwin-x86_64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.8_universal.app.tar.gz",
      "signature": "这里放 .app.tar.gz.sig 文件里的完整内容"
    }
  }
}
```

## 6. 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `version` | string | 是 | 最新版本号，必须高于当前客户端版本才会提示更新。 |
| `notes` | string | 否 | 更新说明，支持 `\n` 换行。 |
| `pub_date` | string | 否 | 发布时间，推荐 ISO 8601 / RFC3339，例如 `2026-06-17T12:00:00Z`。 |
| `platforms` | object | 是 | 不同系统和安装包类型对应的下载地址与签名。 |
| `url` | string | 是 | 安装包下载地址，建议使用国内 CDN / 对象存储。 |
| `signature` | string | 是 | Tauri 打包生成的 `.sig` 文件内容。不是路径，不是 URL，不是 hash。 |

## 7. 平台 key 说明

| key | 用途 |
| --- | --- |
| `windows-x86_64` | Windows 默认更新目标，建议指向 MSI。 |
| `windows-x86_64-msi` | Windows MSI 安装包。 |
| `windows-x86_64-nsis` | Windows EXE / NSIS 安装包。 |
| `darwin-aarch64` | Apple Silicon Mac。 |
| `darwin-x86_64` | Intel Mac。 |
| `darwin-aarch64-app` | 可选，Apple Silicon Mac app tar 包。 |
| `darwin-x86_64-app` | 可选，Intel Mac app tar 包。 |

## 8. 无更新时怎么返回

推荐返回：

```http
HTTP/1.1 204 No Content
```

也可以返回当前版本或更低版本：

```json
{
  "version": "1.1.8",
  "notes": "当前已经是最新版本",
  "pub_date": "2026-06-17T12:00:00Z",
  "platforms": {}
}
```

更推荐 `204 No Content`，响应最快，也不会让客户端解析多余内容。

## 9. 后端 Node.js 示例

```js
app.get("/july-player/latest.json", (req, res) => {
  res.json({
    version: "1.1.8",
    notes: [
      "七月播放器 1.1.8 更新说明：",
      "- 优化远程更新",
      "- 修复已知问题"
    ].join("\n"),
    pub_date: "2026-06-17T12:00:00Z",
    platforms: {
      "windows-x86_64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.8_x64_zh-CN.msi",
        signature: process.env.JULY_PLAYER_MSI_SIGNATURE
      },
      "windows-x86_64-msi": {
        url: "https://julyres.top/july-player/七月播放器_1.1.8_x64_zh-CN.msi",
        signature: process.env.JULY_PLAYER_MSI_SIGNATURE
      },
      "windows-x86_64-nsis": {
        url: "https://julyres.top/july-player/七月播放器_1.1.8_x64-setup.exe",
        signature: process.env.JULY_PLAYER_EXE_SIGNATURE
      },
      "darwin-aarch64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.8_universal.app.tar.gz",
        signature: process.env.JULY_PLAYER_MAC_SIGNATURE
      },
      "darwin-x86_64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.8_universal.app.tar.gz",
        signature: process.env.JULY_PLAYER_MAC_SIGNATURE
      }
    }
  });
});
```

## 10. 发布检查清单

- `version` 已经高于当前客户端版本。
- `latest.json` 可以通过浏览器直接访问。
- `Content-Type` 是 `application/json`。
- 必须包含 `windows-x86_64`、`windows-x86_64-msi`、`windows-x86_64-nsis`、`darwin-aarch64`、`darwin-x86_64`。
- 所有 `url` 都必须是安装包直链，不是后台页面地址，也不是只给浏览器使用的下载按钮地址。
- 所有 `url` 对 `HEAD` 或 `Range: bytes=0-0` 请求返回 `200` / `206`，不能返回 `404`、登录页或 HTML。
- 每个安装包旁边都有同一次构建生成的 `.sig`。
- 所有 `signature` 都是对应 `.sig` 文件内容。
- 没有把 `.sig` 路径或 URL 写进 `signature`。
- 国内 CDN 已刷新缓存。

可以用客户端仓库里的验证脚本检查：

```powershell
npm run verify:update-manifest
```

如果播放器报 `Download request failed with status: 404 Not Found`，优先检查 `latest.json.platforms.*.url`。只要 `latest.json` 能访问但里面的安装包 URL 是 404，Tauri updater 就会下载失败；即使网站页面里的下载按钮能用也不够。
