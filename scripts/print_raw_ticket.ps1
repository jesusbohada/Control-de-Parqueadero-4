param(
    [Parameter(Mandatory=$true)]
    [string]$TextPath,

    [Parameter(Mandatory=$false)]
    [string]$PrinterName = "SAT 22TUS",

    [Parameter(Mandatory=$false)]
    [switch]$AutoCut,

    [Parameter(Mandatory=$false)]
    [switch]$OpenDrawer
)

$ErrorActionPreference = "Stop"

$rawHelperCode = @"
using System;
using System.Runtime.InteropServices;

public class RawEscPosPrinterHelper {
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
        di.pDocName = "Thermal ESCPOS Ticket";
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

if (-not ([System.Management.Automation.PSTypeName]'RawEscPosPrinterHelper').Type) {
    Add-Type -TypeDefinition $rawHelperCode
}

if (-not (Test-Path $TextPath)) {
    Write-Error "Archivo de texto no encontrado: $TextPath"
    exit 1
}

$content = [System.IO.File]::ReadAllText($TextPath, [System.Text.Encoding]::UTF8)

$bytes = [System.Collections.Generic.List[byte]]::new()
$bytes.AddRange([byte[]](0x1B, 0x40)) # ESC @ (init)
$bytes.AddRange([byte[]](0x1B, 0x74, 0x00)) # Code page CP437

if ($OpenDrawer) {
    $bytes.AddRange([byte[]](0x1B, 0x70, 0x00, 0x19, 0xFA)) # Drawer kick pin 2
    $bytes.AddRange([byte[]](0x1B, 0x70, 0x01, 0x19, 0xFA)) # Drawer kick pin 5
}

# Normalizar texto reemplazando caracteres no-ASCII de manera segura
$normalizedBytes = [System.Text.Encoding]::Convert([System.Text.Encoding]::UTF8, [System.Text.Encoding]::GetEncoding("ISO-8859-1"), [System.Text.Encoding]::UTF8.GetBytes($content))
$bytes.AddRange($normalizedBytes)
$bytes.AddRange([byte[]](0x0A, 0x0A, 0x0A, 0x0A)) # Feed 4 lines

if ($AutoCut) {
    $bytes.AddRange([byte[]](0x1D, 0x56, 0x00)) # Cut
}

$ok = [RawEscPosPrinterHelper]::Send($PrinterName, $bytes.ToArray())
if ($ok) {
    Write-Output "SUCCESS: Ticket RAW ESC/POS enviado a $PrinterName"
} else {
    Write-Error "ERROR: Fallo al enviar ticket a $PrinterName"
    exit 1
}
