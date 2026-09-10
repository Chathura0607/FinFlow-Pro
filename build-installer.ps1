# FinFlow Pro - Automated Windows Setup.exe Builder
$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       FinFlow Pro - Standalone Setup.exe Builder              " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

$baseDir = Get-Location
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $csc)) {
    Write-Error "Microsoft C# Compiler (csc.exe) not found at $csc"
    exit 1
}

# Step 1: Build React/Vite Frontend
Write-Host "`n[1/6] Building React Web Frontend..." -ForegroundColor Green
Set-Location "$baseDir\micro-finance-web"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Web build failed!"
    exit 1
}
Set-Location $baseDir

# Step 2: Generate Icon if not present
Write-Host "`n[2/6] Generating FinFlow Pro Brand Icons..." -ForegroundColor Green
if (-not (Test-Path "app.ico")) {
    & $csc /target:exe /out:"installer\GenIcon.exe" "installer\GenerateIcon.cs"
    & ".\installer\GenIcon.exe"
}

# Step 3: Compile Standalone Launcher & Uninstaller
Write-Host "`n[3/6] Compiling Standalone Launcher & Uninstaller..." -ForegroundColor Green
& $csc /target:winexe /win32icon:app.ico /out:FinFlow-Pro.exe Launcher.cs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Launcher compilation failed!"
    exit 1
}

& $csc /target:winexe /win32icon:app.ico /out:installer\Uninstall.exe installer\Uninstaller.cs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Uninstaller compilation failed!"
    exit 1
}

# Step 4: Prepare Staging Payload
Write-Host "`n[4/6] Creating Application Payload Archive..." -ForegroundColor Green
$stagingDir = "$baseDir\installer\staging"
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

Copy-Item "FinFlow-Pro.exe" -Destination "$stagingDir\FinFlow-Pro.exe"
Copy-Item "installer\Uninstall.exe" -Destination "$stagingDir\Uninstall.exe"
Copy-Item "app.ico" -Destination "$stagingDir\app.ico"
Copy-Item "micro-finance-web\dist" -Destination "$stagingDir\dist" -Recurse

$payloadZip = "$baseDir\installer\Payload.zip"
if (Test-Path $payloadZip) {
    Remove-Item $payloadZip -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $payloadZip)

# Step 5: Compile Standalone Setup.exe
Write-Host "`n[5/6] Compiling Standalone Setup.exe with Embedded Payload..." -ForegroundColor Green
$installerSource = "installer\Installer.cs"
$outFile = "FinFlow-Pro-Setup.exe"

& $csc /target:winexe /win32icon:app.ico /resource:"$payloadZip,Payload.zip" /resource:"app.ico,app.ico" /r:System.IO.Compression.FileSystem.dll /r:System.IO.Compression.dll /out:$outFile $installerSource

if ($LASTEXITCODE -ne 0) {
    Write-Error "Setup.exe compilation failed!"
    exit 1
}

Copy-Item "FinFlow-Pro-Setup.exe" -Destination "Setup.exe" -Force

# Step 6: Clean up temporary staging
Write-Host "`n[6/6] Cleaning temporary build artifacts..." -ForegroundColor Green
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}

$setupSize = (Get-Item "Setup.exe").Length / 1MB
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] FinFlow Pro Single-Click Installer Created!" -ForegroundColor Green
Write-Host " Output Files:" -ForegroundColor Yellow
Write-Host "   -> $(Resolve-Path Setup.exe) ($([math]::Round($setupSize, 2)) MB)" -ForegroundColor White
Write-Host "   -> $(Resolve-Path FinFlow-Pro-Setup.exe) ($([math]::Round($setupSize, 2)) MB)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
