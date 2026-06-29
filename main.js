// Electron 主进程 - 子网计算器
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 800,
        minWidth: 480,           // 移动布局在 <=640px 触发，480 留作"勉强可读"下限；容器 max-width: 820 会随窗口收缩
        minHeight: 600,
        title: '子网计算器 - Subnet Calculator',
        backgroundColor: '#e8e8e8',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'www', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 阻止导航到外部页面（防止 XSS 引发的跳转）
    mainWindow.webContents.on('will-navigate', (e, url) => {
        const fileUrl = `file:///${path.join(__dirname, 'www', 'index.html').replace(/\\/g, '/')}`;
        if (!url.startsWith(fileUrl) && !url.startsWith('file://')) {
            e.preventDefault();
            shell.openExternal(url);
        }
    });

    // window.open 一律走系统浏览器
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function buildMenu() {
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about', label: '关于 ' + app.name },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        }] : []),
        {
            label: '文件',
            submenu: [
                {
                    label: '重新加载',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow && mainWindow.reload(),
                },
                { type: 'separator' },
                isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' },
            ],
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' },
            ],
        },
        {
            label: '视图',
            submenu: [
                { role: 'togglefullscreen', label: '切换全屏' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '重置缩放' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: '子网计算器 · Subnet Calculator',
                            detail: `版本 ${app.getVersion()}\n基于 Electron + Metro UI 风格\n\n输入 IP 与掩码/CIDR 即可计算网络地址、广播地址、可用主机范围等。\n\nGitHub: github.com/liuhua1202/subnet-calculator`,
                            buttons: ['确定'],
                        });
                    },
                },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        buildMenu();
        createWindow();
    });
}

app.on('window-all-closed', () => {
    if (!isMac) app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});