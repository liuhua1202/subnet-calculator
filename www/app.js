// www/app.js
// 前端交互层：DOM 渲染 + 事件监听。
// 纯函数（IP/掩码计算）全部在 www/subnet.js，可单测。
(function () {
    'use strict';

    // SubnetCalc 由 www/subnet.js 提供（见 index.html 的 <script> 加载顺序）
    const { ipToOctets, maskToOctets, octetsToCidr, cidrToOctets, toBinaryOctets, getIpType, computeSubnet } = window.SubnetCalc;

    // ============ DOM 元素 ============
    const ipInput = document.getElementById('ipInput');
    const maskInput = document.getElementById('maskInput');
    const btnCalc = document.getElementById('btnCalc');
    const resultsGrid = document.getElementById('resultsGrid');
    const binaryContent = document.getElementById('binaryContent');
    const ipTypeSection = document.getElementById('ipTypeSection');
    const toast = document.getElementById('toast');

    // ============ 渲染 ============
    function calculate() {
        ipInput.classList.remove('error');
        maskInput.classList.remove('error');

        const ipOctets = ipToOctets(ipInput.value);
        const maskOctets = maskToOctets(maskInput.value);

        if (!ipOctets) { showError(ipInput, '请输入有效的IP地址'); return; }
        if (!maskOctets) { showError(maskInput, '请输入有效的子网掩码'); return; }

        const cidr = octetsToCidr(maskOctets);
        if (cidr < 0) { showError(maskInput, '子网掩码不连续，请使用合法的掩码'); return; }

        const r = computeSubnet(ipOctets, maskOctets, cidr);
        maskInput.value = String(cidr);

        // IP 类型按**网络地址**判断（更准确：192.168.1.5/16 应被视为 private）
        const netType = getIpType(r.networkOctets);
        ipTypeSection.innerHTML = `
            <span style="font-weight:600;font-size:12px;letter-spacing:0.5px;color:#555;">网络类型：</span>
            <span class="ip-type-badge ${netType.cls}">${escapeHtml(netType.label)}</span>
        `;

        const tiles = [
            { label: '网络地址', value: r.network, accent: 'accent-blue', copy: true },
            { label: '广播地址', value: r.broadcast, accent: 'accent-red', copy: true },
            { label: '可用IP范围', value: r.firstHost + ' ~ ' + r.lastHost,
              accent: 'accent-green', small: true, copy: true, sub: r.hostSub },
            { label: '子网掩码', value: r.mask + '  /' + r.cidr,
              accent: 'accent-purple', copy: true },
            { label: '通配符掩码', value: r.wildcard, accent: 'accent-teal', copy: true },
            { label: '可用主机数', value: r.usableHosts.toLocaleString(), accent: 'accent-cyan', copy: false },
            { label: 'CIDR前缀', value: '/' + r.cidr, accent: 'accent-blue', copy: false },
            { label: '网络类型', value: netType.label,
              accent: 'accent-' + (netType.cls === 'public' ? 'green'
                  : netType.cls === 'private' ? 'orange' : 'red'),
              small: true, copy: false },
        ];

        resultsGrid.innerHTML = tiles.map((t) => `
            <div class="tile ${t.accent}${t.copy ? ' copyable' : ''}" data-copy="${t.copy ? escapeAttr(t.value) : ''}">
                <span class="tile-label">${t.label}</span>
                <span class="tile-value${t.small ? ' small' : ''}">${escapeHtml(t.value)}</span>
                ${t.sub ? `<div class="tile-sub">${escapeHtml(t.sub)}</div>` : ''}
                ${t.copy ? '<button class="copy-btn" type="button" aria-label="复制">📋</button>' : ''}
            </div>
        `).join('');

        // 二进制
        binaryContent.innerHTML = `
            ${renderBinRow('IP地址', toBinaryOctets(ipOctets), cidr)}
            ${renderBinRow('子网掩码', toBinaryOctets(maskOctets), cidr)}
            ${renderBinRow('网络地址', toBinaryOctets(r.networkOctets), cidr)}
            ${renderBinRow('广播地址', toBinaryOctets(r.broadcastOctets), cidr)}
            <div style="font-size:10px;color:#999;margin-top:6px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;"><span style="display:inline-block;width:10px;height:10px;background:#0078d4;"></span><span>蓝色 = 网络位</span><span style="color:#bbb;">|</span><span style="display:inline-block;width:10px;height:10px;background:#ddd;"></span><span>灰色 = 主机位</span></div>
        `;
    }

    function showError(inputEl, message) {
        inputEl.classList.add('error');
        resultsGrid.innerHTML =
            `<div class="tile accent-red" style="grid-column:1/-1;text-align:center;">
                <div class="tile-value" style="color:#e81123;">❌ ${escapeHtml(message)}</div>
            </div>`;
        binaryContent.innerHTML = '';
        ipTypeSection.innerHTML = '';
    }

    function renderBinRow(label, binOctets, cidr) {
        const spans = binOctets.map((octet, idx) => {
            const octetStart = idx * 8;
            const octetEnd = octetStart + 8;
            const isFullOctet = octetEnd <= cidr;
            let html = '';
            for (let b = 0; b < 8; b++) {
                const bitPos = octetStart + b;
                const isHighlight = bitPos < cidr;
                html += `<span style="color:${isHighlight ? '#0078d4' : '#999'};font-weight:${isHighlight ? '700' : '400'};">${octet[b]}</span>`;
                if (b === 3) html += ' ';
            }
            return `<span class="bin-octet${isFullOctet ? ' highlight' : ''}">${html}</span>`;
        }).join('<span style="color:#ccc;margin:0 2px;">·</span>');
        return `
            <div class="binary-row">
                <span class="bin-label">${label}</span>
                <div class="bin-octets">${spans}</div>
            </div>`;
    }

    // ============ HTML 转义（防 XSS + 修复属性转义漏洞） ============
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function escapeAttr(s) { return escapeHtml(s); }

    // ============ 复制 ============
    /**
     * 复制到剪贴板
     * 优先 navigator.clipboard（异步、安全上下文）
     * Fallback：textarea + execCommand（已废弃但兼容老 Android WebView）
     */
    async function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // 进入 fallback
            }
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }

    // ============ Toast ============
    let toastHideTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.style.display = 'block';
        toast.style.animation = 'none';
        // 触发 reflow 重启动画（读 offsetWidth 强制浏览器 flush layout）
        void toast.offsetWidth;
        toast.style.animation = 'fadeInUp 0.3s ease, fadeOut 0.3s ease 1.5s forwards';

        // 用 animationend 监听最后一帧——之前 1800ms setTimeout 与 2100ms 动画
        // 不匹配，导致 toast 在 fadeOut 中途被 display:none 截掉
        clearTimeout(toastHideTimer);
        const onEnd = () => {
            toast.style.display = 'none';
            toast.removeEventListener('animationend', onEnd);
        };
        toast.addEventListener('animationend', onEnd);
        // 兜底：prefers-reduced-motion 会抑制动画，10s 后强制隐藏
        toastHideTimer = setTimeout(() => {
            toast.style.display = 'none';
            toast.removeEventListener('animationend', onEnd);
        }, 10000);
    }

    // ============ 事件 ============
    // 填充 CIDR 下拉菜单
    (function populateMaskDropdown() {
        const frag = document.createDocumentFragment();
        for (let i = 32; i >= 0; i--) {
            const mask = cidrToOctets(i).join('.');
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = '/' + i + '   ' + mask;
            frag.appendChild(opt);
        }
        maskInput.appendChild(frag);
        maskInput.value = '24';
    })();

    btnCalc.addEventListener('click', calculate);

    ipInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            calculate();
        }
    });

    // IP 输入：去抖 400ms；下拉框 change：立即计算
    let debounceTimer = null;
    ipInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculate, 400);
    });
    maskInput.addEventListener('change', () => {
        // 清掉 input 的 debounce，避免 400ms 后重复计算
        clearTimeout(debounceTimer);
        calculate();
    });

    // 磁贴复制：事件委托，一次绑定复用
    resultsGrid.addEventListener('click', async (e) => {
        const tile = e.target.closest('.tile[data-copy]');
        if (!tile || !tile.dataset.copy) return;
        const ok = await copyToClipboard(tile.dataset.copy);
        showToast(ok ? '✅ 已复制：' + tile.dataset.copy : '❌ 复制失败');
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            calculate();
        }
    });

    // 首次进入：input 空 → calculate() 显示"请输入有效 IP"错误提示
    calculate();
})();
