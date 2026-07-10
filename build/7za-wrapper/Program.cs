// 7za wrapper: injects -snl- to skip symlinks on Windows.
// Compiled by build/7za-wrapper/build.js (npm postinstall hook in package.json) on Windows.
using System;
using System.Diagnostics;
using System.Text;

class Wrapper
{
    static int Main(string[] args)
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string real = System.IO.Path.Combine(exeDir, "7za-real.exe");
        if (!System.IO.File.Exists(real))
        {
            Console.Error.WriteLine("7za-real.exe not found next to wrapper at: " + exeDir);
            return 1;
        }

        // 用老 API Arguments 字符串而不是 ArgumentList（后者需要 .NET Core 2.1+，
        // VS 2022 BuildTools 默认 target framework 不一定支持）
        // 7za 参数通常是路径，需要 quote 防止空格被切断
        var sb = new StringBuilder();
        foreach (var a in args)
        {
            if (sb.Length > 0) sb.Append(' ');
            sb.Append(QuoteArg(a));
        }
        // 永远注入 -snl- 跳过符号链接（这是本 wrapper 存在的意义）
        sb.Append(" -snl-");

        var psi = new ProcessStartInfo(real, sb.ToString())
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
        };

        try
        {
            using var p = Process.Start(psi);
            p.OutputDataReceived += (s, e) => { if (e.Data != null) Console.Out.WriteLine(e.Data); };
            p.ErrorDataReceived += (s, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            p.WaitForExit();
            return p.ExitCode;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    // 简单 Windows 命令行 quote：以双引号包裹，内部双引号转义为 \"
    static string QuoteArg(string a)
    {
        if (a == null) return "\"\"";
        if (a.Length == 0) return "\"\"";
        bool needsQuote = a.IndexOfAny(new[] { ' ', '\t', '"' }) >= 0;
        if (!needsQuote) return a;
        return "\"" + a.Replace("\"", "\\\"") + "\"";
    }
}
