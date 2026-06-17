# 七月播放器远程更新 latest.json 格式说明

播放器会请求下面这个地址检查更新：

```text
GET https://julyres.top/july-player/latest.json
Content-Type: application/json
```

## 1. 基础格式

后端返回的 `latest.json` 建议使用下面格式：

```json
{
  "version": "1.1.7",
  "notes": "七月播放器 1.1.7 更新说明：\n- 修复 xxx\n- 优化更新速度",
  "pub_date": "2026-06-17T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi",
      "signature": "这里放 .msi.sig 文件里的完整内容"
    },
    "windows-x86_64-msi": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi",
      "signature": "这里放 .msi.sig 文件里的完整内容"
    },
    "windows-x86_64-nsis": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.7_x64-setup.exe",
      "signature": "这里放 .exe.sig 文件里的完整内容"
    },
    "darwin-aarch64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz",
      "signature": "这里放 .app.tar.gz.sig 文件里的完整内容"
    },
    "darwin-x86_64": {
      "url": "https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz",
      "signature": "这里放 .app.tar.gz.sig 文件里的完整内容"
    }
  }
}
```

## 2. 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `version` | string | 是 | 最新版本号，必须高于当前客户端版本才会提示更新。例如当前是 `1.1.6`，这里写 `1.1.7`。 |
| `notes` | string | 否 | 更新说明，支持 `\n` 换行。会显示在播放器更新提示里。 |
| `pub_date` | string | 否 | 发布时间，推荐使用 ISO 8601 / RFC3339 格式，例如 `2026-06-17T12:00:00Z`。 |
| `platforms` | object | 是 | 不同系统和安装包类型对应的下载地址与签名。 |
| `url` | string | 是 | 安装包下载地址。建议使用国内 CDN / 对象存储地址。 |
| `signature` | string | 是 | Tauri 打包生成的 `.sig` 文件内容，必须原样复制。不是 MD5，也不是 SHA256。 |

## 3. 平台 key 说明

| key | 用途 |
| --- | --- |
| `windows-x86_64` | Windows 默认更新目标，建议指向 MSI。 |
| `windows-x86_64-msi` | Windows MSI 安装包。 |
| `windows-x86_64-nsis` | Windows EXE / NSIS 安装包。 |
| `darwin-aarch64` | Apple Silicon Mac。 |
| `darwin-x86_64` | Intel Mac。 |
| `darwin-aarch64-app` | 可选，Apple Silicon Mac app tar 包。 |
| `darwin-x86_64-app` | 可选，Intel Mac app tar 包。 |

## 4. 后端无更新时怎么返回

有两种方式：

```http
HTTP/1.1 204 No Content
```

或者继续返回当前版本 / 更低版本：

```json
{
  "version": "1.1.6",
  "notes": "当前已经是最新版本",
  "pub_date": "2026-06-17T12:00:00Z",
  "platforms": {}
}
```

更推荐 `204 No Content`，响应最快，也不会让客户端解析多余内容。

## 5. 国内加速部署建议

为了让检查更新和下载安装都快，下面这些文件都要放到国内 CDN / 对象存储：

```text
https://julyres.top/july-player/latest.json
https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi
https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi.sig
https://julyres.top/july-player/七月播放器_1.1.7_x64-setup.exe
https://julyres.top/july-player/七月播放器_1.1.7_x64-setup.exe.sig
https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz
https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz.sig
```

如果 `latest.json` 放在国内，但是里面的 `url` 还是 GitHub 地址，只能让“检查更新”变快，下载安装包还是会慢。

## 6. 生成 latest.json 的后端示例

Node.js / Express 示例：

```js
app.get("/july-player/latest.json", (req, res) => {
  res.json({
    version: "1.1.7",
    notes: [
      "七月播放器 1.1.7 更新说明：",
      "- 优化国内更新检查速度",
      "- 修复已知问题"
    ].join("\n"),
    pub_date: "2026-06-17T12:00:00Z",
    platforms: {
      "windows-x86_64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi",
        signature: process.env.JULY_PLAYER_MSI_SIGNATURE
      },
      "windows-x86_64-msi": {
        url: "https://julyres.top/july-player/七月播放器_1.1.7_x64_zh-CN.msi",
        signature: process.env.JULY_PLAYER_MSI_SIGNATURE
      },
      "windows-x86_64-nsis": {
        url: "https://julyres.top/july-player/七月播放器_1.1.7_x64-setup.exe",
        signature: process.env.JULY_PLAYER_EXE_SIGNATURE
      },
      "darwin-aarch64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz",
        signature: process.env.JULY_PLAYER_MAC_SIGNATURE
      },
      "darwin-x86_64": {
        url: "https://julyres.top/july-player/七月播放器_1.1.7_universal.app.tar.gz",
        signature: process.env.JULY_PLAYER_MAC_SIGNATURE
      }
    }
  });
});
```

## 7. 发布检查清单

- `version` 已经高于当前客户端版本。
- `latest.json` 可以通过浏览器直接访问。
- `Content-Type` 是 `application/json`。
- 所有 `url` 都可以直接下载。
- 所有 `.sig` 文件内容已经复制到对应 `signature` 字段。
- 安装包和签名来自同一次 Tauri 构建，不能混用旧签名。
- 国内 CDN 已刷新缓存。
