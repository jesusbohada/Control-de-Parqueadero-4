param(
    [Parameter(Mandatory=$false)]
    [string]$PrinterName = "POS-80"
)

$ErrorActionPreference = "Stop"

# Helper de impresión de bajo nivel (RAW spooler)
$rawHelperCode = @"
using System;
using System.Runtime.InteropServices;

public class RawDrawerHelper {
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

    public static bool KickDrawer(string szPrinterName) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Open Cash Drawer";
        di.pDataType = "RAW";
        bool success = false;

        try {
            if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                if (StartDocPrinter(hPrinter, 1, di)) {
                    if (StartPagePrinter(hPrinter)) {
                        // Multi-Pin Kick Sequence:
                        // 1. ESC p 0 25 250 (Pin 2: m=0, t1=50ms, t2=500ms)
                        // 2. ESC p 1 25 250 (Pin 5: m=1, t1=50ms, t2=500ms)
                        // 3. DLE DC4 real-time drawer kick (0x10, 0x14, 0x01, 0x00, 0x05)
                        // 4. Bell character (0x07) for legacy/Star printers
                        byte[] pulse = new byte[] {
                            0x1B, 0x70, 0x00, 0x19, 0xFA,
                            0x1B, 0x70, 0x01, 0x19, 0xFA,
                            0x10, 0x14, 0x01, 0x00, 0x05,
                            0x07
                        };

                        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pulse.Length);
                        Marshal.Copy(pulse, 0, pUnmanagedBytes, pulse.Length);
                        int dwWritten = 0;
                        success = WritePrinter(hPrinter, pUnmanagedBytes, pulse.Length, out dwWritten);
                        Marshal.FreeCoTaskMem(pUnmanagedBytes);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
        } catch {
            return false;
        }
        return success;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawDrawerHelper').Type) {
    Add-Type -TypeDefinition $rawHelperCode
}

$ok = [RawDrawerHelper]::KickDrawer($PrinterName)
if ($ok) {
    Write-Output "SUCCESS: Pulso de apertura de gaveta enviado correctamente a '$PrinterName'"
    exit 0
} else {
    Write-Error "ERROR: No se pudo abrir el cajón monedero en la impresora '$PrinterName'"
    exit 1
}
