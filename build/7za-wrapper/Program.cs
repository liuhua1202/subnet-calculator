// 7za wrapper with debug logging
using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class Wrapper
{
    static string QuoteArg(string a)
    {
        if (a.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return a;
        return "\"" + a.Replace("\"", "\\\"") + "\"";
    }

    static int Main(string[] args)
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string real = Path.Combine(exeDir, "7za-real.exe");
        if (!File.Exists(real))
        {
            Console.Error.WriteLine("7za-real.exe not found next to wrapper at: " + exeDir);
            return 1;
        }

        var sb = new StringBuilder();
        foreach (var a in args) { sb.Append(QuoteArg(a)); sb.Append(' '); }
        sb.Append("-snl-");

        var fullCmd = real + " " + sb.ToString();
        Console.Error.WriteLine("[7za-wrapper] Executing: " + fullCmd);

        var psi = new ProcessStartInfo
        {
            FileName = real,
            Arguments = sb.ToString(),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };

        try
        {
            var p = Process.Start(psi);
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
