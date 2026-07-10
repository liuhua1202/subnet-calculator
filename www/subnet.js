// www/subnet.js
// 纯函数库：IP/掩码/CIDR 转换与 IP 类型识别。
// 浏览器：通过 <script> 加载，挂到 window.SubnetCalc
// Node 单测：通过 require() 拿到 module.exports
// 不用 ES module 是为了兼容 minSdk 22 的 Android WebView（< script type=module > 不支持）。

(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SubnetCalc = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * 点分十进制字符串 → 4 段数组
     * @param {string} ipStr
     * @returns {[number,number,number,number]|null}
     */
    function ipToOctets(ipStr) {
        const parts = ipStr.trim().split('.');
        if (parts.length !== 4) return null;
        const octets = [];
        for (const p of parts) {
            const num = parseInt(p, 10);
            if (isNaN(num) || num < 0 || num > 255) return null;
            octets.push(num);
        }
        return octets;
    }

    /**
     * 4 段数组 → uint32
     * `>>> 0` 强制把 `<<` 产生的有符号结果转回无符号
     */
    function ipToUint32(octets) {
        return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
    }

    /** uint32 → 4 段数组 */
    function uint32ToOctets(num) {
        return [
            (num >>> 24) & 0xFF,
            (num >>> 16) & 0xFF,
            (num >>> 8) & 0xFF,
            num & 0xFF,
        ];
    }

    /** uint32 → 点分十进制字符串 */
    function uint32ToIp(num) {
        return uint32ToOctets(num).join('.');
    }

    /**
     * 掩码字符串（CIDR 或点分十进制）→ 4 段数组
     * @param {string} maskStr 接受 '/24', '24', '255.255.255.0'
     * @returns {[number,number,number,number]|null}
     */
    function maskToOctets(maskStr) {
        if (maskStr.trim().startsWith('/')) {
            const cidr = parseInt(maskStr.trim().slice(1), 10);
            if (isNaN(cidr) || cidr < 0 || cidr > 32) return null;
            return cidrToOctets(cidr);
        }
        const octets = ipToOctets(maskStr);
        if (octets) {
            // 合法掩码：~mask 是 2 的幂（含 0）
            const uint = ipToUint32(octets);
            const inverted = (~uint) >>> 0;
            if ((inverted & (inverted + 1)) === 0) {
                return octets;
            }
            const num = parseInt(maskStr.trim(), 10);
            if (!isNaN(num) && num >= 0 && num <= 32) {
                return cidrToOctets(num);
            }
            return null;
        }
        const num = parseInt(maskStr.trim(), 10);
        if (!isNaN(num) && num >= 0 && num <= 32) {
            return cidrToOctets(num);
        }
        return null;
    }

    /** CIDR 前缀（0-32）→ 4 段掩码数组 */
    function cidrToOctets(cidr) {
        const mask = cidr === 0 ? 0 : ((0xFFFFFFFF << (32 - cidr)) >>> 0);
        return uint32ToOctets(mask);
    }

    /**
     * 4 段掩码 → CIDR 前缀；非法掩码返回 -1
     * 思路：左移直到最高位的 1 移出去，记移位次数 = cidr
     */
    function octetsToCidr(octets) {
        const uint = ipToUint32(octets);
        if (uint === 0) return 0;
        let cidr = 0;
        let mask = uint;
        // `<< 1` 会产生负数，必须 `>>> 0` 转回 uint32
        while (mask & 0x80000000) {
            cidr++;
            mask = (mask << 1) >>> 0;
        }
        const expectedMask = cidr === 0 ? 0 : ((0xFFFFFFFF << (32 - cidr)) >>> 0);
        if (expectedMask !== uint) return -1;
        return cidr;
    }

    /** 4 段数组 → 8 位二进制字符串数组 */
    function toBinaryOctets(octets) {
        return octets.map(o => o.toString(2).padStart(8, '0'));
    }

    /**
     * IP 类型识别
     * 检查顺序很重要：必须先匹配特殊地址（broadcast、unspecified），
     * 否则 255.255.255.255 (first=255) 会被 `>= 240` 误判为保留 E 类。
     * @param {[number,number,number,number]} octets
     */
    function getIpType(octets) {
        const first = octets[0];
        const second = octets[1];
        const full = ipToUint32(octets);

        if (full === 0xFFFFFFFF) return { type: 'broadcast', label: '受限广播地址 (255.255.255.255)', cls: 'broadcast' };
        if (full === 0) return { type: 'unspecified', label: '未指定地址 (0.0.0.0)', cls: 'reserved' };
        if (first === 0) return { type: 'reserved', label: '保留地址 (0.0.0.0/8)', cls: 'reserved' };
        if (first === 127) return { type: 'loopback', label: '回环地址 (127.0.0.0/8)', cls: 'loopback' };

        if (first === 10) return { type: 'private', label: '私有地址 A类 (10.0.0.0/8)', cls: 'private' };
        if (first === 172 && second >= 16 && second <= 31) return { type: 'private', label: '私有地址 B类 (172.16.0.0/12)', cls: 'private' };
        if (first === 192 && second === 168) return { type: 'private', label: '私有地址 C类 (192.168.0.0/16)', cls: 'private' };
        // CGNAT（运营商级 NAT，RFC 6598）
        if (first === 100 && second >= 64 && second <= 127) return { type: 'private', label: 'CGNAT 共享地址 (100.64.0.0/10)', cls: 'private' };

        if (first === 169 && second === 254) return { type: 'link-local', label: '链路本地 (169.254.0.0/16)', cls: 'link-local' };
        // RFC 5737 文档示例地址
        if (first === 192 && second === 0 && octets[2] === 2) return { type: 'reserved', label: '文档示例 TEST-NET-1 (192.0.2.0/24)', cls: 'reserved' };
        if (first === 198 && second === 51 && octets[2] === 100) return { type: 'reserved', label: '文档示例 TEST-NET-2 (198.51.100.0/24)', cls: 'reserved' };
        if (first === 203 && second === 0 && octets[2] === 113) return { type: 'reserved', label: '文档示例 TEST-NET-3 (203.0.113.0/24)', cls: 'reserved' };
        if (first >= 224 && first <= 239) return { type: 'multicast', label: '多播地址 D类 (224.0.0.0/4)', cls: 'multicast' };
        if (first >= 240) return { type: 'reserved', label: '保留地址 E类 (240.0.0.0/4)', cls: 'reserved' };

        if (first >= 1 && first <= 126) return { type: 'public-a', label: '公网地址 A类', cls: 'public' };
        if (first >= 128 && first <= 191) return { type: 'public-b', label: '公网地址 B类', cls: 'public' };
        if (first >= 192) return { type: 'public-c', label: '公网地址 C类', cls: 'public' };
        return { type: 'public', label: '公网地址', cls: 'public' };
    }

    /**
     * 主计算：给定 IP octets 和 mask octets，返回完整结果对象
     * @param {[number,number,number,number]} ipOctets
     * @param {[number,number,number,number]} maskOctets
     * @param {number} cidr
     */
    function computeSubnet(ipOctets, maskOctets, cidr) {
        const ipUint = ipToUint32(ipOctets);
        const maskUint = ipToUint32(maskOctets);
        const networkUint = (ipUint & maskUint) >>> 0;
        const wildcardUint = (~maskUint) >>> 0;
        const broadcastUint = (networkUint | wildcardUint) >>> 0;

        let totalHosts, usableHosts, firstHostUint, lastHostUint, hostSub;
        if (cidr === 32) {
            totalHosts = 1;
            usableHosts = 0;
            firstHostUint = networkUint;
            lastHostUint = networkUint;
            hostSub = '/32：单主机地址，无可用范围';
        } else if (cidr === 31) {
            totalHosts = 2;
            usableHosts = 2;
            firstHostUint = networkUint;
            lastHostUint = broadcastUint;
            hostSub = '/31：RFC 3021 点对点，两个地址都可用';
        } else {
            const hostBits = 32 - cidr;
            totalHosts = Math.pow(2, hostBits);
            usableHosts = totalHosts - 2;
            firstHostUint = (networkUint + 1) >>> 0;
            lastHostUint = (broadcastUint - 1) >>> 0;
            hostSub = null;
        }

        return {
            network: uint32ToIp(networkUint),
            broadcast: uint32ToIp(broadcastUint),
            firstHost: uint32ToIp(firstHostUint),
            lastHost: uint32ToIp(lastHostUint),
            mask: maskOctets.join('.'),
            wildcard: uint32ToIp(wildcardUint),
            totalHosts,
            usableHosts,
            cidr,
            hostSub,
            networkOctets: uint32ToOctets(networkUint),
            broadcastOctets: uint32ToOctets(broadcastUint),
        };
    }

    return {
        ipToOctets,
        ipToUint32,
        uint32ToOctets,
        uint32ToIp,
        maskToOctets,
        cidrToOctets,
        octetsToCidr,
        toBinaryOctets,
        getIpType,
        computeSubnet,
    };
}));
