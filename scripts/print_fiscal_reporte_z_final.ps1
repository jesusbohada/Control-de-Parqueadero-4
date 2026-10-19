param(
    [string]$PrinterName = "SAT 22TUS"
)

$rawHelperCode = @"
using System;
using System.Runtime.InteropServices;

public class FiscalPrinter {
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

    public static bool PrintBytes(string printer, byte[] bytes) {
        IntPtr h = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Reporte Z Fiscal";
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

if (-not ([System.Management.Automation.PSTypeName]'FiscalPrinter').Type) {
    Add-Type -TypeDefinition $rawHelperCode
}

# Helper formatting
$lineWidth = 42

function Center-Text([string]$text) {
    if ($text.Length -ge $lineWidth) { return $text.Substring(0, $lineWidth) }
    $totalPad = $lineWidth - $text.Length
    $leftPad = [Math]::Floor($totalPad / 2)
    return (" " * $leftPad) + $text
}

function Row-Text([string]$left, [string]$right) {
    $rLen = $right.Length
    $maxLeft = $lineWidth - $rLen - 1
    if ($left.Length -gt $maxLeft) {
        $left = $left.Substring(0, $maxLeft)
    }
    $spaces = $lineWidth - $left.Length - $rLen
    if ($spaces -lt 1) { $spaces = 1 }
    return $left + (" " * $spaces) + $right
}

function Table-Row-3([string]$c1, [string]$c2, [string]$c3) {
    # 22 chars for c1, 6 chars for c2, 14 chars for c3 = 42 total
    $s1 = if ($c1.Length -gt 22) { $c1.Substring(0, 22) } else { $c1.PadRight(22) }
    $s2 = if ($c2.Length -gt 6) { $c2.Substring(0, 6) } else { $c2.PadLeft(6) }
    $s3 = if ($c3.Length -gt 14) { $c3.Substring(0, 14) } else { $c3.PadLeft(14) }
    return $s1 + $s2 + $s3
}

$sep = "=" * $lineWidth
$thinSep = "-" * $lineWidth

$lines = [System.Collections.Generic.List[string]]::new()

$lines.Add((Center-Text "PARQUEADERO CENTRAL PLAZA"))
$lines.Add((Center-Text "NIT: 900.543.210-9"))
$lines.Add((Center-Text "Av. Circunvalar # 14 - 80"))
$lines.Add((Center-Text "TEL: (601) 789-0123 / 310-555-0000"))
$lines.Add((Center-Text "SEDE PRINCIPAL CENTRO"))
$lines.Add($sep)
$lines.Add((Center-Text "**** CIERRE DEFINITIVO (REPORTE Z) ****"))
$lines.Add((Center-Text "AUDITORIA FISCAL Y CONCILIACION GENERAL"))
$lines.Add($sep)

$lines.Add((Row-Text "JORNADA N°:" "#1"))
$lines.Add((Row-Text "Consecutivo Oficial:" "Z-0001"))
$lines.Add((Row-Text "Fecha Apertura:" "19/10/2026 06:00 AM"))
$lines.Add((Row-Text "Fecha / Hora Cierre:" (Get-Date -Format 'dd/MM/yyyy hh:mm tt')))
$lines.Add((Row-Text "Total Turnos Operados:" "2 Turnos"))
$lines.Add((Row-Text "Administrador Resp.:" "ADMINISTRADOR GENERAL"))
$lines.Add("")

# SECCION 1
$lines.Add($sep)
$lines.Add((Center-Text "1. MOVIMIENTO GENERAL DE VEHICULOS"))
$lines.Add($sep)
$lines.Add((Row-Text "Total Tickets Emitidos:" "38"))
$lines.Add((Row-Text "Vehiculos Liquidados / Salidas:" "35"))
$lines.Add((Row-Text "Vehiculos en Patio (Amanecidos):" "3"))
$lines.Add((Row-Text "Rango Tickets Fiscales:" "TKT-001 al TKT-038"))
$lines.Add($thinSep)
$lines.Add((Table-Row-3 "TIPO VEHICULO" "CANT" "TOTAL"))
$lines.Add($thinSep)
$lines.Add((Table-Row-3 "Automovil / Carro" "18" "$ 342.000"))
$lines.Add((Table-Row-3 "Motocicleta" "14" "$ 168.000"))
$lines.Add((Table-Row-3 "Camioneta / SUV" "3" "$ 105.000"))
$lines.Add($thinSep)
$lines.Add((Table-Row-3 "TOTAL VEHICULOS" "35" "$ 615.000"))
$lines.Add("")

# SECCION 2
$lines.Add($sep)
$lines.Add((Center-Text "2. DESGLOSE POR TURNOS DE CAJA"))
$lines.Add($sep)
$lines.Add((Table-Row-3 "TURNO / CAJERO" "EFECT." "TOTAL"))
$lines.Add($thinSep)
$lines.Add((Table-Row-3 "T#1: Carlos Restrepo" "260.000" "$ 320.000"))
$lines.Add((Table-Row-3 "T#2: Maria Fernanda" "220.000" "$ 295.000"))
$lines.Add($thinSep)
$lines.Add((Table-Row-3 "CONSOLIDADO TURNOS" "480.000" "$ 615.000"))
$lines.Add("")

# SECCION 3
$lines.Add($sep)
$lines.Add((Center-Text "3. DISCRIMINACION POR MEDIOS DE PAGO"))
$lines.Add($sep)
$lines.Add((Row-Text "Efectivo en Caja" "$ 480.000"))
$lines.Add((Row-Text "Tarjetas Deb/Cred (POS)" "$ 65.000"))
$lines.Add((Row-Text "Billeteras (Nequi/Daviplata)" "$ 40.000"))
$lines.Add((Row-Text "Codigos QR (Bancolombia QR)" "$ 30.000"))
$lines.Add($thinSep)
$lines.Add((Row-Text "GRAN TOTAL VENTAS DIA" "$ 615.000"))
$lines.Add("")

# SECCION 4
$lines.Add($sep)
$lines.Add((Center-Text "4. CONCILIACION DE EFECTIVO (BOVEDA)"))
$lines.Add($sep)
$lines.Add((Row-Text "(+) Base Inicial del Dia:" "$ 100.000"))
$lines.Add((Row-Text "(+) Ventas Efectivo Turnos:" "$ 480.000"))
$lines.Add((Row-Text "(-) Gastos de Operacion:" "-$ 25.000"))
$lines.Add((Row-Text "(-) Retiros Parciales Boveda:" "-$ 20.000"))
$lines.Add($thinSep)
$lines.Add((Row-Text "(=) Efectivo Total Esperado:" "$ 535.000"))
$lines.Add((Row-Text "Efectivo Fisico Contado:" "$ 535.000"))
$lines.Add($thinSep)
$lines.Add((Row-Text "CUADRE EXACTO:" "$ 0"))
$lines.Add($sep)
$lines.Add((Row-Text "LIQUIDACION A DEPOSITAR:" "$ 435.000"))
$lines.Add($sep)
$lines.Add("")
$lines.Add("Detalle de Egresos Registrados:")
$lines.Add((Row-Text " • Rollos de papel termico 80mm:" "-$ 15.000"))
$lines.Add((Row-Text " • Insumos de aseo taquilla:" "-$ 10.000"))
$lines.Add((Row-Text " • Traslado preventivo caja fuerte:" "-$ 20.000"))
$lines.Add("")
$lines.Add("Observaciones de Auditoria:")
$lines.Add("Jornada cerrada con arqueo exacto sin descuadres.")
$lines.Add("Se aparta base de $100.000 para el primer turno")
$lines.Add("del dia de manana. Quedan 3 vehiculos en patio.")
$lines.Add("")
$lines.Add("")
$lines.Add((Center-Text "___________________________"))
$lines.Add((Center-Text "FIRMA ADMINISTRADOR GENERAL"))
$lines.Add((Center-Text "C.C. ______________________"))
$lines.Add("")
$lines.Add((Center-Text "___________________________"))
$lines.Add((Center-Text "REVISOR FISCAL / AUDITOR"))
$lines.Add((Center-Text "T.P. ______________________"))
$lines.Add("")
$lines.Add($sep)
$lines.Add((Center-Text "wolfzonepos - Sistema de Parqueadero"))
$lines.Add("")
$lines.Add("")
$lines.Add("")

$rawBytes = [System.Collections.Generic.List[byte]]::new()
$rawBytes.AddRange([byte[]](0x1B, 0x40)) # ESC @ (init)
$rawBytes.AddRange([byte[]](0x1B, 0x74, 0x00)) # Code page CP437
$rawBytes.AddRange([System.Text.Encoding]::ASCII.GetBytes(($lines -join "`r`n")))
$rawBytes.AddRange([byte[]](0x0A, 0x0A, 0x0A, 0x0A)) # Feed
$rawBytes.AddRange([byte[]](0x1D, 0x56, 0x00)) # GS V 0 (Cut)

$ok = [FiscalPrinter]::PrintBytes($PrinterName, $rawBytes.ToArray())
Write-Host "Resultado Impresion Fiscal SAT 22TUS: $ok"
