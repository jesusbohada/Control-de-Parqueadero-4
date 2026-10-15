param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath,

    [Parameter(Mandatory=$false)]
    [string]$PrinterName = "POS-80",

    [Parameter(Mandatory=$false)]
    [string]$PaperWidth = "80mm",

    [Parameter(Mandatory=$false)]
    [switch]$AutoCut,

    [Parameter(Mandatory=$false)]
    [switch]$OpenDrawer,

    [Parameter(Mandatory=$false)]
    [int]$Threshold = 168
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

# 1. RawPrinterHelper para corte y pulso de gaveta
$rawHelperCode = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
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

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Thermal Control";
        di.pDataType = "RAW";
        bool success = false;

        try {
            if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                if (StartDocPrinter(hPrinter, 1, di)) {
                    if (StartPagePrinter(hPrinter)) {
                        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                        Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                        int dwWritten = 0;
                        success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
    Add-Type -TypeDefinition $rawHelperCode
}

# 2. Procesador Monocromático de Alta Fidelidad
$processorCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ThermalDarkProcessor {
    public static Bitmap ProcessImage(Bitmap src, int targetWidth, byte threshold) {
        double scale = (double)targetWidth / (double)src.Width;
        int targetHeight = (int)(src.Height * scale);

        Bitmap resized = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(resized)) {
            g.Clear(Color.White);
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            g.DrawImage(src, 0, 0, targetWidth, targetHeight);
        }

        BitmapData data = resized.LockBits(
            new Rectangle(0, 0, targetWidth, targetHeight),
            ImageLockMode.ReadWrite,
            PixelFormat.Format32bppArgb
        );

        int bytes = Math.Abs(data.Stride) * targetHeight;
        byte[] rgb = new byte[bytes];
        Marshal.Copy(data.Scan0, rgb, 0, bytes);

        int lastBlackY = 0;

        for (int y = 0; y < targetHeight; y++) {
            int rowOffset = y * data.Stride;
            for (int x = 0; x < targetWidth; x++) {
                int i = rowOffset + (x * 4);
                int lum = (rgb[i + 2] * 299 + rgb[i + 1] * 587 + rgb[i] * 114) / 1000;

                if (lum < threshold) {
                    rgb[i] = 0;
                    rgb[i + 1] = 0;
                    rgb[i + 2] = 0;
                    rgb[i + 3] = 255;
                    if (y > lastBlackY) lastBlackY = y;
                } else {
                    rgb[i] = 255;
                    rgb[i + 1] = 255;
                    rgb[i + 2] = 255;
                    rgb[i + 3] = 255;
                }
            }
        }

        Marshal.Copy(rgb, 0, data.Scan0, bytes);
        resized.UnlockBits(data);

        int finalHeight = Math.Min(targetHeight, lastBlackY + 28);
        if (finalHeight < 120) finalHeight = targetHeight;

        Bitmap cropped = new Bitmap(targetWidth, finalHeight, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(cropped)) {
            g.DrawImage(resized, 0, 0, new Rectangle(0, 0, targetWidth, finalHeight), GraphicsUnit.Pixel);
        }
        resized.Dispose();

        return cropped;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'ThermalDarkProcessor').Type) {
    Add-Type -TypeDefinition $processorCode -ReferencedAssemblies System.Drawing
}

if (-not (Test-Path $ImagePath)) {
    Write-Error "El archivo de imagen no existe: $ImagePath"
    exit 1
}

# 3. Apertura de gaveta si se solicitó
if ($OpenDrawer) {
    try {
        [RawPrinterHelper]::SendBytesToPrinter($PrinterName, [byte[]](0x1B, 0x70, 0x00, 0x19, 0xFA)) | Out-Null
    } catch {}
}

# 4. Procesar imagen gráfica
$is58 = $PaperWidth -eq "58mm"
$targetDots = if ($is58) { 384 } else { 576 }

$rawImg = [System.Drawing.Image]::FromFile($ImagePath)
$bmpSrc = New-Object System.Drawing.Bitmap $rawImg
$darkBmp = [ThermalDarkProcessor]::ProcessImage($bmpSrc, $targetDots, [byte]$Threshold)
$bmpSrc.Dispose()
$rawImg.Dispose()

# 5. Configurar documento de impresión GDI continuo
$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = $PrinterName

# Buscar tamaño continuo de bobina térmica
$rollPaper = $null
foreach ($ps in $doc.PrinterSettings.PaperSizes) {
    if ($is58 -and $ps.PaperName -match "58.*3276") {
        $rollPaper = $ps
        break
    } elseif (-not $is58 -and $ps.PaperName -match "80.*3276") {
        $rollPaper = $ps
        break
    }
}

if ($rollPaper -ne $null) {
    $doc.DefaultPageSettings.PaperSize = $rollPaper
} else {
    $rollWidth = if ($is58) { 189 } else { 283 }
    $doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize("ThermalContinuous", $rollWidth, 12897)
}

$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

$doc.add_PrintPage({
    param($sender, $e)

    $pageWidth = $e.PageBounds.Width
    if ($pageWidth -le 0 -or $pageWidth -gt 350) {
        $pageWidth = if ($is58) { 189 } else { 283 }
    }

    $scale = [double]$pageWidth / [double]$darkBmp.Width
    $drawWidth = $pageWidth
    $drawHeight = [int]($darkBmp.Height * $scale)

    $destRect = New-Object System.Drawing.Rectangle 0, 0, $drawWidth, $drawHeight

    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $e.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $e.Graphics.DrawImage(
        $darkBmp,
        $destRect,
        0, 0, $darkBmp.Width, $darkBmp.Height,
        [System.Drawing.GraphicsUnit]::Pixel
    )

    $e.HasMorePages = $false
})

try {
    $doc.Print()
} finally {
    $darkBmp.Dispose()
    $doc.Dispose()
}

# 6. Corte automático ESC/POS
if ($AutoCut) {
    Start-Sleep -Milliseconds 250
    try {
        [RawPrinterHelper]::SendBytesToPrinter($PrinterName, [byte[]](0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00)) | Out-Null
    } catch {}
}

Write-Output "SUCCESS: Impresion grafica de alta definicion enviada correctamente a $PrinterName"
