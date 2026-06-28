// 7za wrapper: injects -snl- to skip symlinks on Windows.
// Triggered by electron-builder postinstall via build/7za-wrapper/build.js
using System;
using System.Diagnostics;

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

        var psi = new ProcessStartInfo(real)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = System.Text.Encoding.UTF8,
        };
        // ArgumentList 正确处理空格/引号，无需手动 QuoteArg
        foreach (var a in args) psi.ArgumentList.Add(a);
        psi.ArgumentList.Add("-snl-");

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
}