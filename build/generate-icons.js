// build/generate-icons.js
// 从 www/icon.svg 生成所有平台需要的图标。
//
// 输出：
// - android/app/src/main/res/mipmap-{density}/ic_launcher.png
// - android/app/src/main/res/mipmap-{density}/ic_launcher_round.png
// - android/app/src/main/res/mipmap-{density}/ic_launcher_foreground.png
//   (adaptive icon 的前景，108dp 内容居中在 432x432，内含 288x288 安全区)
//
// 用法：node build/generate-icons.js
// 前置：npm install --no-save sharp

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'www', 'icon.svg');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Android 密度 → 基准 dp（1dp = mdpi 上的 1px）
const DENSITIES = [
    { name: 'mdpi',    px: 48 },
    { name: 'hdpi',    px: 72 },
    { name: 'xhdpi',   px: 96 },
    { name: 'xxhdpi',  px: 144 },
    { name: 'xxxhdpi', px: 192 },
];

// 自适应图标前景：108dp 画布，72dp 安全区
// xxxhdpi 1dp = 4px → 108dp = 432px, 72dp = 288px
const FG_SIZE = 432;
const FG_SAFE_AREA = 288;

async function renderSvg(svgBuffer, width, height) {
    return await sharp(svgBuffer, { density: 384 })
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
}

// 合成图：白底 + SVG（让 currentColor 显式为深色，因为浏览器渲染时 currentColor 默认黑）
async function renderOnWhite(svgBuffer, width, height) {
    return await sharp({
        create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
        .composite([{ input: await renderSvg(svgBuffer, width, height), top: 0, left: 0 }])
        .png()
        .toBuffer();
}

// 自适应图标前景：透明背景 + 居中 SVG（在 432x432 内放 288x288 的 SVG）
async function renderForeground(svgBuffer) {
    return await sharp({
        create: { width: FG_SIZE, height: FG_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .composite([{ input: await renderSvg(svgBuffer, FG_SAFE_AREA, FG_SAFE_AREA), top: (FG_SIZE - FG_SAFE_AREA) / 2, left: (FG_SIZE - FG_SAFE_AREA) / 2 }])
        .png()
        .toBuffer();
}

async function main() {
    if (!fs.existsSync(SVG_PATH)) {
        console.error('SVG not found: ' + SVG_PATH);
        process.exit(1);
    }
    const svg = fs.readFileSync(SVG_PATH);

    for (const { name, px } of DENSITIES) {
        const dir = path.join(ANDROID_RES, 'mipmap-' + name);

        // ic_launcher.png（白底）
        const launcher = await renderOnWhite(svg, px, px);
        fs.writeFileSync(path.join(dir, 'ic_launcher.png'), launcher);
        console.log('  ' + name + '/ic_launcher.png  (' + px + 'x' + px + ', ' + launcher.length + ' B)');

        // ic_launcher_round.png（Android 7.1 launcher 直接用，跟方版同图；adaptive icon 自己走 mipmap-anydpi-v26）
        fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), launcher);
        console.log('  ' + name + '/ic_launcher_round.png  (' + px + 'x' + px + ')');

        // ic_launcher_foreground.png（adaptive icon 前景，432x432 only，固定尺寸；放各密度目录的同名文件）
        const fg = await renderForeground(svg);
        fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg);
        console.log('  ' + name + '/ic_launcher_foreground.png  (' + FG_SIZE + 'x' + FG_SIZE + ', ' + fg.length + ' B)');
    }

    console.log('Done. Regenerate Android icons from www/icon.svg.');
}

main().catch(e => { console.error(e); process.exit(1); });
