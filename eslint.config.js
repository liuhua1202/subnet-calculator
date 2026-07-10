// ESLint 9 flat config
// 只做基本检查：语法 + 常见 bad smells，不强加代码风格（不绑定 Prettier）
module.exports = [
    {
        files: ['www/app.js', 'www/subnet.js', 'main.js', 'build/7za-wrapper/build.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                // browser
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                console: 'readonly',
                module: 'readonly',        // UMD 文件里用
                self: 'readonly',
                // node
                process: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
                exports: 'writable',
            },
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'warn',
            eqeqeq: ['error', 'always'],
            'no-implicit-globals': 'off', // UMD 模式会向 self 挂全局，规则要松
        },
    },
    {
        // subnet.js 用了 UMD 自执行，语法上像有未定义引用
        files: ['www/subnet.js', 'www/app.js'],
        rules: {
            'no-undef': 'off',
        },
    },
    {
        // Vitest 用 ESM
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        rules: {
            // 测试里 `import` 都用到了，不算未用变量
            'no-unused-vars': 'off',
        },
    },
];
