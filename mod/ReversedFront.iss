
[Setup]
AppName=ReversedFront
AppVersion=2.0.0.0
DefaultDirName={pf}\ReversedFront
DefaultGroupName=ReversedFront
OutputDir=E:\moyul\Desktop\ReversedFront\Buildexe
OutputBaseFilename=ReversedFrontInstaller
SetupIconFile=E:\moyul\Desktop\ReversedFront\logo.ico


[Files]
Source: "E:\moyul\Desktop\ReversedFront\Buildexe\main.dist\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\ReversedFront"; Filename: "{app}\ReversedFront.exe"
Name: "{userdesktop}\ReversedFront"; Filename: "{app}\ReversedFront.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "在桌面建立捷徑"; GroupDescription: "啟動ReversedFront"