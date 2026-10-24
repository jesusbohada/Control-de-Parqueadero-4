Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
currentDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

Dim args, i
args = ""
For i = 0 To WScript.Arguments.Count - 1
    args = args & " " & Chr(34) & WScript.Arguments(i) & Chr(34)
Next

WshShell.Run Chr(34) & currentDir & "\Iniciar-Parqueadero.bat" & Chr(34) & args, 0, False
Set WshShell = Nothing
Set FSO = Nothing
