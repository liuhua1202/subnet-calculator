// tests/subnet.test.js
// 单测：覆盖所有 SubnetCalc 纯函数
import { describe, it, expect } from 'vitest';
import {
    ipToOctets, ipToUint32, uint32ToOctets, uint32ToIp,
    maskToOctets, cidrToOctets, octetsToCidr,
    toBinaryOctets, getIpType, computeSubnet,
} from '../www/subnet.js';

describe('ipToOctets', () => {
    it('解析标准 IPv4', () => {
        expect(ipToOctets('192.168.1.1')).toEqual([192, 168, 1, 1]);
    });
    it('允许 0 和 255 边界值', () => {
        expect(ipToOctets('0.0.0.0')).toEqual([0, 0, 0, 0]);
        expect(ipToOctets('255.255.255.255')).toEqual([255, 255, 255, 255]);
    });
    it('接受前后空格', () => {
        expect(ipToOctets('  10.0.0.1  ')).toEqual([10, 0, 0, 1]);
    });
    it('段数不是 4 → null', () => {
        expect(ipToOctets('1.2.3')).toBeNull();
        expect(ipToOctets('1.2.3.4.5')).toBeNull();
        expect(ipToOctets('')).toBeNull();
    });
    it('octet 越界或非数字 → null', () => {
        expect(ipToOctets('256.1.1.1')).toBeNull();
        expect(ipToOctets('-1.1.1.1')).toBeNull();
        expect(ipToOctets('abc.1.1.1')).toBeNull();
        expect(ipToOctets('1.2.3.x')).toBeNull();
    });
    it('空 octet（双点）→ null', () => {
        expect(ipToOctets('1..2.3')).toBeNull();
    });
    it('前导零被 parseInt 接受（10 进制）', () => {
        expect(ipToOctets('192.168.001.001')).toEqual([192, 168, 1, 1]);
    });
});

describe('ipToUint32 / uint32ToIp 互逆', () => {
    it('round-trip 一些常用值', () => {
        const cases = ['0.0.0.0', '255.255.255.255', '192.168.1.1', '10.0.0.1', '8.8.8.8'];
        for (const ip of cases) {
            const oct = ipToOctets(ip);
            const u = ipToUint32(oct);
            expect(uint32ToIp(u)).toBe(ip);
        }
    });
    it('0.0.0.0 → 0', () => {
        expect(ipToUint32([0, 0, 0, 0])).toBe(0);
    });
    it('255.255.255.255 → 0xFFFFFFFF', () => {
        expect(ipToUint32([255, 255, 255, 255])).toBe(0xFFFFFFFF);
    });
    it('128.0.0.0 → 0x80000000（高位 1）', () => {
        expect(ipToUint32([128, 0, 0, 0])).toBe(0x80000000);
    });
});

describe('cidrToOctets / octetsToCidr 互逆', () => {
    it.each([0, 1, 8, 16, 24, 25, 30, 31, 32])('CIDR /%d 互逆', (c) => {
        const oct = cidrToOctets(c);
        expect(octetsToCidr(oct)).toBe(c);
    });
    it('CIDR 0 → 0.0.0.0', () => {
        expect(cidrToOctets(0)).toEqual([0, 0, 0, 0]);
    });
    it('CIDR 32 → 255.255.255.255', () => {
        expect(cidrToOctets(32)).toEqual([255, 255, 255, 255]);
    });
    it('CIDR 24 → 255.255.255.0', () => {
        expect(cidrToOctets(24)).toEqual([255, 255, 255, 0]);
    });
    it('非法掩码（不连续 1）→ -1', () => {
        // 255.0.255.0  = 11111111.00000000.11111111.00000000  → 0/8/0/8 不连续
        expect(octetsToCidr([255, 0, 255, 0])).toBe(-1);
        // 255.1.0.0    = 11111111.00000001.00000000.00000000  → 8/1 不连续
        expect(octetsToCidr([255, 1, 0, 0])).toBe(-1);
    });
    it('合法但不常见的连续掩码', () => {
        // 255.254.0.0 = 11111111.11111110.00000000.00000000 = /15
        expect(octetsToCidr([255, 254, 0, 0])).toBe(15);
        // 255.255.128.0 = 11111111.11111111.10000000.00000000 = /17
        expect(octetsToCidr([255, 255, 128, 0])).toBe(17);
    });
});

describe('maskToOctets', () => {
    it('接受 /CIDR 形式', () => {
        expect(maskToOctets('/24')).toEqual([255, 255, 255, 0]);
        expect(maskToOctets('/0')).toEqual([0, 0, 0, 0]);
        expect(maskToOctets('/32')).toEqual([255, 255, 255, 255]);
    });
    it('接受点分十进制合法掩码', () => {
        expect(maskToOctets('255.255.255.0')).toEqual([255, 255, 255, 0]);
        expect(maskToOctets('0.0.0.0')).toEqual([0, 0, 0, 0]);
    });
    it('拒绝不连续掩码', () => {
        expect(maskToOctets('255.0.255.0')).toBeNull();
    });
    it('非法点分十进制 fallback 到纯数字 CIDR', () => {
        expect(maskToOctets('16')).toEqual([255, 255, 0, 0]);
    });
    it('接受带前导斜杠 + 数字', () => {
        expect(maskToOctets('/16')).toEqual([255, 255, 0, 0]);
    });
    it('完全乱码 → null', () => {
        expect(maskToOctets('abc')).toBeNull();
        expect(maskToOctets('256')).toBeNull();
        expect(maskToOctets('/-1')).toBeNull();
        expect(maskToOctets('/33')).toBeNull();
    });
    it('前后空格容忍', () => {
        expect(maskToOctets('  255.255.255.0  ')).toEqual([255, 255, 255, 0]);
    });
});

describe('toBinaryOctets', () => {
    it('每段 8 位二进制', () => {
        expect(toBinaryOctets([192, 168, 1, 1])).toEqual(['11000000', '10101000', '00000001', '00000001']);
    });
    it('0 padding', () => {
        expect(toBinaryOctets([0, 0, 0, 0])).toEqual(['00000000', '00000000', '00000000', '00000000']);
    });
});

describe('getIpType', () => {
    it('255.255.255.255 → broadcast', () => {
        expect(getIpType([255, 255, 255, 255]).type).toBe('broadcast');
    });
    it('0.0.0.0 → unspecified', () => {
        expect(getIpType([0, 0, 0, 0]).type).toBe('unspecified');
    });
    it('0.x.x.x → reserved（v1.0.4 修过的 case）', () => {
        expect(getIpType([0, 1, 2, 3]).type).toBe('reserved');
    });
    it('127.x.x.x → loopback', () => {
        expect(getIpType([127, 0, 0, 1]).type).toBe('loopback');
    });
    it('10/8 → private', () => {
        expect(getIpType([10, 0, 0, 1]).type).toBe('private');
    });
    it('172.16/12 范围 → private', () => {
        expect(getIpType([172, 16, 0, 1]).type).toBe('private');
        expect(getIpType([172, 31, 255, 254]).type).toBe('private');
        // 边界外
        expect(getIpType([172, 15, 0, 1]).type).not.toBe('private');
        expect(getIpType([172, 32, 0, 1]).type).not.toBe('private');
    });
    it('192.168/16 → private', () => {
        expect(getIpType([192, 168, 1, 1]).type).toBe('private');
    });
    it('100.64/10（CGNAT, RFC 6598）→ private', () => {
        expect(getIpType([100, 64, 0, 1]).type).toBe('private');
        expect(getIpType([100, 127, 255, 254]).type).toBe('private');
        expect(getIpType([100, 63, 0, 1]).type).not.toBe('private');
        expect(getIpType([100, 128, 0, 1]).type).not.toBe('private');
    });
    it('169.254/16 → link-local', () => {
        expect(getIpType([169, 254, 1, 1]).type).toBe('link-local');
    });
    it('RFC 5737 文档示例地址 → reserved', () => {
        expect(getIpType([192, 0, 2, 1]).type).toBe('reserved');
        expect(getIpType([198, 51, 100, 1]).type).toBe('reserved');
        expect(getIpType([203, 0, 113, 1]).type).toBe('reserved');
    });
    it('224.0.0.0/4 → multicast', () => {
        expect(getIpType([224, 0, 0, 1]).type).toBe('multicast');
        expect(getIpType([239, 255, 255, 255]).type).toBe('multicast');
    });
    it('240/4 → reserved E 类', () => {
        expect(getIpType([240, 0, 0, 1]).type).toBe('reserved');
        expect(getIpType([255, 255, 255, 254]).type).toBe('reserved');
    });
    it('公网按有类', () => {
        expect(getIpType([8, 8, 8, 8]).cls).toBe('public');
        expect(getIpType([8, 8, 8, 8]).type).toBe('public-a');
        expect(getIpType([130, 50, 1, 1]).type).toBe('public-b');
        expect(getIpType([200, 1, 1, 1]).type).toBe('public-c');
    });
});

describe('computeSubnet', () => {
    it('经典 /24 案例', () => {
        const r = computeSubnet([192, 168, 1, 100], [255, 255, 255, 0], 24);
        expect(r.network).toBe('192.168.1.0');
        expect(r.broadcast).toBe('192.168.1.255');
        expect(r.firstHost).toBe('192.168.1.1');
        expect(r.lastHost).toBe('192.168.1.254');
        expect(r.totalHosts).toBe(256);
        expect(r.usableHosts).toBe(254);
        expect(r.wildcard).toBe('0.0.0.255');
        expect(r.hostSub).toBeNull();
    });
    it('/20 案例', () => {
        const r = computeSubnet([172, 16, 50, 99], [255, 255, 240, 0], 20);
        expect(r.network).toBe('172.16.48.0');
        expect(r.broadcast).toBe('172.16.63.255');
        expect(r.firstHost).toBe('172.16.48.1');
        expect(r.lastHost).toBe('172.16.63.254');
        expect(r.totalHosts).toBe(4096);
        expect(r.usableHosts).toBe(4094);
    });
    it('/30 点对点（传统）', () => {
        const r = computeSubnet([10, 5, 5, 5], [255, 255, 255, 252], 30);
        expect(r.network).toBe('10.5.5.4');
        expect(r.broadcast).toBe('10.5.5.7');
        expect(r.firstHost).toBe('10.5.5.5');
        expect(r.lastHost).toBe('10.5.5.6');
        expect(r.totalHosts).toBe(4);
        expect(r.usableHosts).toBe(2);
    });
    it('/31 RFC 3021 点对点', () => {
        const r = computeSubnet([10, 5, 5, 4], [255, 255, 255, 254], 31);
        expect(r.network).toBe('10.5.5.4');
        expect(r.broadcast).toBe('10.5.5.5');
        expect(r.firstHost).toBe('10.5.5.4');
        expect(r.lastHost).toBe('10.5.5.5');
        expect(r.totalHosts).toBe(2);
        expect(r.usableHosts).toBe(2);
        expect(r.hostSub).toContain('RFC 3021');
    });
    it('/32 单主机', () => {
        const r = computeSubnet([192, 168, 1, 5], [255, 255, 255, 255], 32);
        expect(r.network).toBe('192.168.1.5');
        expect(r.broadcast).toBe('192.168.1.5');
        expect(r.firstHost).toBe('192.168.1.5');
        expect(r.lastHost).toBe('192.168.1.5');
        expect(r.totalHosts).toBe(1);
        expect(r.usableHosts).toBe(0);
        expect(r.hostSub).toContain('/32');
    });
    it('/0 全网', () => {
        const r = computeSubnet([192, 168, 1, 1], [0, 0, 0, 0], 0);
        expect(r.network).toBe('0.0.0.0');
        expect(r.broadcast).toBe('255.255.255.255');
        expect(r.firstHost).toBe('0.0.0.1');
        expect(r.lastHost).toBe('255.255.255.254');
        expect(r.totalHosts).toBe(4294967296);
        expect(r.usableHosts).toBe(4294967294);
    });
    it('/8 案例', () => {
        const r = computeSubnet([8, 8, 8, 8], [255, 0, 0, 0], 8);
        expect(r.network).toBe('8.0.0.0');
        expect(r.broadcast).toBe('8.255.255.255');
        expect(r.firstHost).toBe('8.0.0.1');
        expect(r.lastHost).toBe('8.255.255.254');
        expect(r.totalHosts).toBe(16777216);
    });
    it('返回 networkOctets / broadcastOctets 给前端渲染二进制', () => {
        const r = computeSubnet([192, 168, 1, 100], [255, 255, 255, 0], 24);
        expect(r.networkOctets).toEqual([192, 168, 1, 0]);
        expect(r.broadcastOctets).toEqual([192, 168, 1, 255]);
    });
});
