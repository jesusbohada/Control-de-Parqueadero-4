param(
    [string]$PrinterName = "SAT 22TUS"
)

$rawHelperCode = @"
using System;
using System.Runtime.InteropServices;

public class RawTestHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool Send(string printer, byte[] bytes) {
        IntPtr h = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Test";
        di.pDataType = "RAW";
        if (!OpenPrinter(printer, out h, IntPtr.Zero)) return false;
        bool ok = false;
        if (StartDocPrinter(h, 1, di)) {
            if (StartPagePrinter(h)) {
                IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
                Marshal.Copy(bytes, 0, p, bytes.Length);
                int written = 0;
                ok = WritePrinter(h, p, bytes.Length, out written);
                Marshal.FreeCoTaskMem(p);
                EndPagePrinter(h);
            }
            EndDocPrinter(h);
        }
        ClosePrinter(h);
        return ok;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawTestHelper').Type) {
    Add-Type -TypeDefinition $rawHelperCode
}

# ESC @ (Init), text, ESC d 3 (feed 3 lines), GS V 0 (cut)
$bytes = [System.Collections.Generic.List[byte]]::new()
$bytes.AddRange([byte[]](0x1B, 0x40)) # Initialize
$text = "`r`n================================`r`n"
$text += "  PRUEBA CONEXION FISICA IMPRESORA`r`n"
$text += "  Dispositivo: $PrinterName`r`n"
$text += "  Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n"
$text += "================================`r`n`r`n`r`n"
$bytes.AddRange([System.Text.Encoding]::ASCII.GetBytes($text))
$bytes.AddRange([byte[]](0x1D, 0x56, 0x00)) # Auto cut

$result = [RawTestHelper]::Send($PrinterName, $bytes.ToArray())
Write-Output "RESULT:$result"
