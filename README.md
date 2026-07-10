# 子网计算器 · Subnet Calculator

[![GitHub release](https://img.shields.io/github/v/release/liuhua1202/subnet-calculator?style=flat-square)](https://github.com/liuhua1202/subnet-calculator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Android-0078d4?style=flat-square)](#-特性)
[![Electron](https://img.shields.io/badge/electron-33.x-47848F?style=flat-square)](https://www.electronjs.org/)
[![Capacitor](https://img.shields.io/badge/capacitor-6.x-119EFF?style=flat-square)](https://capacitorjs.com/)

跨平台子网计算器 — Windows 桌面（Electron）+ Android（Capacitor）。实时计算网络地址、广播地址、可分配 IP 范围、IP 类型识别、二进制表示。

![screenshot](docs/screenshot.png)

## ✨ 特性

- 🧮 **完整子网计算**：网络地址、广播地址、可分配 IP 范围、子网掩码、通配符掩码、总/可用主机数
- 📋 **下拉式 CIDR 选择**：33 个选项（`/0` ~ `/32`），倒序排列，旁注点分十进制掩码，所见即所得
- 🔍 **IP 类型自动识别**：A/B/C 类、RFC1918 私有、回环、链路本地、组播、保留地址、文档示例段等
- 💾 **二进制表示**：4 段 8 位并排展示，网络位（蓝色 `#0078d4`）/主机位（浅灰 `#ddd`）一眼区分
- ⚡ **即时计算**：IP 输入 400ms 防抖、掩码变更立即重算
- ♿ **可访问性**：`<label>` 关联、`aria-live` 公告结果、`prefers-reduced-motion` 支持
- 📱 **响应式 UI**：自动适配桌面 / 平板 / 手机屏幕，触摸友好
- 🪟 **Windows 单文件便携**：71 MB 独立 `.exe`，零安装，双击即用
- 🤖 **Android 原生应用**：通过 Capacitor 打包为 APK，离线运行

## 📦 下载

前往 [Releases 页面](https://github.com/liuhua1202/subnet-calculator/releases) 下载最新版（产物文件名带版本号）：

| 平台 | 文件 | 大小 |
|---|---|---|
| Windows | `SubnetCalculator-<版本>-portable.exe` | ~70 MB |
| Android | `SubnetCalculator-<版本>.apk` | ~3 MB |
| 校验 | `SHA256SUMS` | — |

> Windows：双击即用，无需安装。  
> Android：开启"未知来源安装"后从手机安装，或使用 adb：`adb install SubnetCalculator-<版本>.apk`。  
> 校验：`sha256sum -c SHA256SUMS`。

## 🚀 本地开发

### 环境要求

- Node.js ≥ 18
- npm ≥ 9
- Android 构建额外需要 JDK 17 + Android SDK（API 34）

### 安装

```bash
git clone https://github.com/liuhua1202/subnet-calculator.git
cd subnet-calculator
npm install
```

### 启动桌面应用

```bash
npm start
```

### 打包 Windows 便携 .exe

```bash
npm run build
# 产物：dist/SubnetCalculator-<version>-portable.exe
```

### 构建 Android APK

```bash
# 1. 同步 web 资源到 android/
npx cap sync android

# 2. 构建 debug APK（需 Android Studio 或命令行 SDK + JDK 17）
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/SubnetCalculator-<version>.apk
```

或在 Android Studio 中打开：

```bash
npx cap open android
```

可用的 npm scripts：

| 命令 | 作用 |
|---|---|
| `npm start` | 启动 Electron 开发模式 |
| `npm run build` | 打包 Windows portable 单文件 .exe |
| `npm run build:installer` | 打包 Windows NSIS 安装版（可选） |
| `npm run android:sync` | 把 www/ 同步到 android/ |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run android:build` | 调用 gradle 构建 debug APK |

## 🏗️ 技术栈

- **[Electron 33](https://www.electronjs.org/)** — Windows 桌面运行时
- **[Capacitor 6](https://capacitorjs.com/)** — Android 打包
- **[electron-builder 25](https://www.electron.build/)** — Windows 打包工具，输出 portable 单文件
- **纯 HTML/CSS/JS** — 无前端框架；`www/index.html` 负责 UI/样式，外加 `www/app.js`（交互）+ `www/subnet.js`（纯函数）
- **GitHub Actions** — CI/CD，`windows-latest` runner 自动构建

### 7za symlink 绕过方案

`electron-builder` 依赖 `winCodeSign` 做 Windows 代码签名，但解压时含 macOS `.dylib` 软链接，Windows 默认权限下 `7za` 失败（exit code 2）。本仓库通过 [`build/7za-wrapper/Program.cs`](build/7za-wrapper/Program.cs) 实现 C# shim：注入 `-snl-` 参数跳过符号链接。`package.json` 的 `postinstall` 钩子调用 [`build/7za-wrapper/build.js`](build/7za-wrapper/build.js) 在 Windows 上自动把 `Program.cs` 编译成 `node_modules/7zip-bin/win/x64/7za.exe`，原 `7za.exe` 备份为 `7za-real.exe`。

## 📂 项目结构

```
subnet-calculator/
├── main.js                    # Electron 主进程（单实例锁、菜单、About、错误处理）
├── www/
│   ├── index.html             # 全部 UI + CSS（拆分自原单文件）
│   ├── app.js                 # 前端交互（DOM + 事件）
│   └── subnet.js              # 纯函数库（IP/掩码/CIDR 计算，可单测）
├── capacitor.config.json      # Capacitor 应用配置
├── package.json               # 依赖、postinstall、构建配置
├── build/
│   └── 7za-wrapper/
│       ├── build.js           # postinstall 钩子：编译 shim
│       └── Program.cs         # 7za C# shim 源码
├── tests/
│   └── subnet.test.js         # Vitest 单测
├── eslint.config.js           # ESLint 9 flat config
├── android/                   # Capacitor 生成的 Android 工程
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       ├── res/values/strings.xml  # app_name = "子网计算器"
│       └── assets/public/          # 同步自 www/
├── docs/
│   └── screenshot.png
├── .github/workflows/
│   └── build.yml              # CI：构建 + 发 Release
├── LICENSE                    # MIT
└── README.md
```

## 🧪 CI/CD

[`.github/workflows/build.yml`](.github/workflows/build.yml) 三个 job 并行/串行：

| Job | Runner | 触发 | 产物 |
|---|---|---|---|
| `build-windows` | windows-latest | 所有 push / PR / tag | `SubnetCalculator-<ver>-portable.exe` |
| `build-android` | ubuntu-latest | 所有 push / PR / tag | `SubnetCalculator-<ver>.apk` |
| `release` | ubuntu-latest | 仅 tag `v*` | GitHub Release + `SHA256SUMS` |

- **concurrency**：新 push 会取消旧 run（PR 立即取消，main 保留到新 push 完成后）
- **缓存**：npm cache + Gradle cache（windows ~30s、Android ~1min 加速）
- **PR**：构建验证但不上传 artifact（节省 CI 分钟）
- **超时**：windows 30min / Android 45min / release 10min
- **权限**：每个 job 独立最小权限

发新版：

```bash
git add -A
git commit -m "feat: 某某功能"
git push origin main

git tag v1.1.0
git push origin v1.1.0
```

## 📝 计算示例

| 输入 | 网络地址 | 广播地址 | 可用范围 | 主机数 |
|---|---|---|---|---|
| `192.168.1.100 /24` | `192.168.1.0` | `192.168.1.255` | `.1 ~ .254` | 254 |
| `172.16.50.99 /20` | `172.16.48.0` | `172.16.63.255` | `.48.1 ~ .63.254` | 4,094 |
| `10.5.5.5 /30` | `10.5.5.4` | `10.5.5.7` | `.5 ~ .6` | 2 |
| `8.8.8.8 /8` | `8.0.0.0` | `8.255.255.255` | `8.0.0.1 ~ 8.255.255.254` | 16,777,214 |

## 📋 v1.0.4 变更摘要

相比 v1.0.3，本版本以 bugfix 为主：

- **修复**：`getIpType` 新增 `0.0.0.0/8` 保留段识别（此前 `0.1.2.3` 等会被误判为公网）
- **修复**：二进制高亮溢出——`renderBinRow` 仅对"整 octet 全是网络位"的字节加 `.highlight` 蓝底；部分网络位字节靠 per-bit 颜色区分，`/25`、`/13` 这类非 8 位对齐 CIDR 不再误导
- **修复**：CI `versionCode` 防碰撞——`%02d%02d` 改为 `%03d%03d`，`1.0.10` 与 `1.1.0` 不再生成相同 `10010`
- **UI**：补 `.ip-type-badge.broadcast` / `.reserved` 样式（`255.255.255.255` 和保留地址 badge 不再裸奔）
- **docs**：修正 `main.js` `minWidth` 注释（480 与容器 max-width 820 不矛盾的说明）
- **cleanup**：移除 `renderBinRow` 中无用的 `totalBits` 变量

## 📋 v1.0.2 变更摘要

相比 v1.0.0/v1.0.1，主要重构：

- **删除**：子网划分表（原用有类边界推算，结果在不同 IP 类下不一致）
- **修复**：`maskToOctets` 不再拒绝 `0.0.0.0`；`getIpType` broadcast 分支不再被 `>=240` 截胡
- **可访问性**：`<label>` 关联、`aria-live`、`:focus-visible`、`prefers-reduced-motion`
- **CI**：concurrency 取消、npm/Gradle cache、SHA256SUMS、每个 job 最小权限与超时
- **依赖**：`@capacitor/android` 移到 devDependencies

## 🐛 故障排查

**Q: 启动后白屏？**
A: 检查是否有 Windows Defender SmartScreen 拦截。便携 .exe 未签名时常见，可右键 → 属性 → 勾选"解除锁定"。

**Q: `npm install` 时 `7za` 解压失败？**
A: 这是 Windows 上的已知问题。`package.json` 的 `postinstall` 会自动调用 `build/7za-wrapper/build.js` 把 C# shim 编译到 `node_modules/7zip-bin/win/x64/7za.exe`。如 postinstall 失败（例如没装 Visual Studio / Build Tools），可手动执行：
```bash
"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\Roslyn\csc.exe" \
  -out:node_modules\7zip-bin\win\x64\7za.exe \
  build\7za-wrapper\Program.cs
# 把原 7za.exe 重命名为 7za-real.exe
# 非 Windows 平台无此问题
```

**Q: Android 构建报 `SDK location not found`？**
A: 在 `android/local.properties` 中设置 `sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk`，或在环境变量 `ANDROID_HOME` 设置 SDK 路径。

**Q: GitHub Actions 失败？**
A: 在 Actions 页查看日志。`windows-latest` runner 自带 csc.exe 和 Android SDK，理论上可直接编译。若失败，把日志粘到 Issue。

## 🧪 测试 & Lint

```bash
npm test        # Vitest 单测（覆盖所有纯函数）
npm run lint    # ESLint
npm run test:watch  # 开发时 watch 模式
```

## 📄 许可证

[MIT](LICENSE) © 2026 liuhua1202