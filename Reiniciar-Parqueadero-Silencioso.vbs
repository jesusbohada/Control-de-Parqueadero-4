Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
currentDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir
WshShell.Run Chr(34) & currentDir & "\Reiniciar-Parqueadero.bat" & Chr(34), 0, False
Set WshShell = Nothing
Set FSO = Nothing
