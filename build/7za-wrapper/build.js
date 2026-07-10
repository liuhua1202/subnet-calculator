// build/7za-wrapper/build.js
// 在 Windows 上把 Program.cs 编译成 7za.exe 的 shim，绕过 7za 解压含 macOS
// 软链接时 exit code 2 的问题。
//
// 流程：
//   1. 把 node_modules/7zip-bin/win/x64/7za.exe 改名为 7za-real.exe
//   2. 用 csc.exe 编译 Program.cs → 7za.exe（注入 -snl- 参数调用 7za-real.exe）
//
// 幂等：再次运行时检测到 7za-real.exe + 7za.exe (shim) 都已就位则跳过。
// 非 Windows：跳过（macOS/Linux 上 electron-builder 不会触发此 bug）。
// 找不到 csc.exe：跳过（不会让 npm install 失败；Windows 用户遇到 7za 软链接
// bug 时可按 README 手动 csc.exe 编译）。

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
    console.log('[7za-wrapper] Skipping (non-Windows platform)');
    process.exit(0);
}

const SEVENZIP_DIR = path.resolve(__dirname, '..', '..', 'node_modules', '7zip-bin', 'win', 'x64');
const TARGET_EXE = path.join(SEVENZIP_DIR, '7za.exe');
const REAL_EXE = path.join(SEVENZIP_DIR, '7za-real.exe');
const PROGRAM_CS = path.join(__dirname, 'Program.cs');

function log(msg) { console.log('[7za-wrapper] ' + msg); }

// 7zip-bin 还没被 npm 解压到 node_modules
if (!fs.existsSync(path.dirname(SEVENZIP_DIR))) {
    log('7zip-bin not installed yet, skipping (will retry on next install)');
    process.exit(0);
}

// 已经是 shim：跳过
if (fs.existsSync(REAL_EXE) && fs.existsSync(TARGET_EXE)) {
    log('Wrapper already installed, skipping');
    process.exit(0);
}

// 原 7za.exe 不存在：7zip-bin 包没装 / 路径错了
if (!fs.existsSync(TARGET_EXE)) {
    log('7za.exe not found at ' + TARGET_EXE + ', skipping');
    process.exit(0);
}

// 找 csc.exe（Roslyn C# 编译器）
const CSC_CANDIDATES = [
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin\\Roslyn\\csc.exe',
];

function findCsc() {
    for (const p of CSC_CANDIDATES) {
        if (fs.existsSync(p)) return p;
    }
    // 兜底：用 where 找 PATH 里的 csc.exe
    try {
        const out = execFileSync('where', ['csc.exe'], { encoding: 'utf8' });
        const first = out.split(/\r?\n/)[0].trim();
        if (first && fs.existsSync(first)) return first;
    } catch {
        // where 不在 PATH
    }
    return null;
}

const csc = findCsc();
if (!csc) {
    log('csc.exe not found, skipping (install Visual Studio Build Tools or VS 2019/2022 Community/Professional)');
    log('If 7za.exe extraction fails later, see README "7za symlink 绕过方案" for manual workaround');
    process.exit(0);
}

// 第 1 步：原 7za.exe → 7za-real.exe
try {
    fs.renameSync(TARGET_EXE, REAL_EXE);
    log('Renamed original 7za.exe to 7za-real.exe');
} catch (e) {
    log('Failed to rename 7za.exe: ' + e.message);
    process.exit(1);
}

// 第 2 步：编译 Program.cs → 7za.exe shim
try {
    execFileSync(csc, ['-nologo', '-out:' + TARGET_EXE, PROGRAM_CS], {
        stdio: 'inherit',
    });
    log('Compiled 7za.exe wrapper successfully (csc=' + path.basename(csc) + ')');
} catch (e) {
    // 编译失败 → 把原 7za.exe 还原回去（避免把安装搞坏）
    try { fs.renameSync(REAL_EXE, TARGET_EXE); } catch {}
    log('Compilation failed, restored original 7za.exe: ' + e.message);
    process.exit(1);
}

log('Done. 7za wrapper installed.');
