# 子网计算器 · Subnet Calculator

Metro 风格的 Windows 桌面子网计算器，基于 Electron 构建，支持 IP 地址子网划分、CIDR/掩码计算、IP 类型识别、二进制表示。

![screenshot](docs/screenshot.png)

## ✨ 特性

- **IP + CIDR 子网计算**：网络地址、广播地址、可分配 IP 范围、子网掩码、通配符掩码
- **三种输入方式**：默认 IP、掩码（点分十进制）或 CIDR 前缀（`/24`）
- **下拉式掩码选择**：33 个 CIDR 选项（`/0` ~ `/32`），倒序排列，所见即所得
- **IP 类型自动识别**：A/B/C 类、RFC1918 私有地址、回环、链路本地、组播、保留地址等
- **二进制表示**：每位主机位/网络位高亮标识
- **即时计算**：IP 输入防抖 400ms，掩码变更立即重算
- **单文件便携**：71 MB 独立 .exe，零安装，双击即用

## 📦 下载

前往 [Releases](https://github.com/<YOUR_USERNAME>/subnet-calculator/releases) 下载最新版的 `SubnetCalculator-1.0.0-portable.exe`。

> Windows 10/11 64 位。无需安装任何运行时，双击即可运行。

## 🚀 本地运行

### 环境要求
- Node.js ≥ 18
- npm ≥ 9
- Windows 10/11（打包目标平台）；其他平台可运行 `npm start` 但打包需 Windows

### 启动开发模式
```bash
git clone https://github.com/<YOUR_USERNAME>/subnet-calculator.git
cd subnet-calculator
npm install
npm start
```

### 打包便携 .exe
```bash
npm run build
# 产物：dist/SubnetCalculator-1.0.0-portable.exe
```

## 🏗️ 构建原理

打包工具：[electron-builder 25.x](https://www.electron.build/)，目标 portable 单文件输出。

依赖 `winCodeSign` 进行 Windows 代码签名，但 `winCodeSign` 解压时含 macOS `.dylib` 软链接，Windows 默认权限下 `7za` 会失败（exit code 2）。本仓库通过 `build/7za-wrapper/Program.cs` 实现 C# shim：注入 `-snl-` 参数跳过符号链接，然后由 electron-builder 的 npm postinstall 把它编译成 `node_modules/7zip-bin/win/x64/7za.exe`，原 `7za.exe` 备份为 `7za-real.exe`。

> GitHub Actions 使用 `windows-latest` 运行器，无需任何额外配置——7za symlink 问题在 Windows runners 下会复现，wrapper 已自动生效。

## 🧪 CI/CD

`.github/workflows/build.yml` 在以下事件自动构建：
- push 到 `main` 分支：构建并上传 artifact
- 打 tag（如 `v1.0.0`）：构建并自动创建 GitHub Release，附上 .exe

## 📄 许可证

[MIT](LICENSE)