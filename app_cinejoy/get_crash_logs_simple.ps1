# Simple crash log capture - saves to file
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CineJoy Crash Log Capture (Simple)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check device
$devicesOutput = adb devices 2>&1 | Out-String
if ($devicesOutput -notmatch "\tdevice\s*$") {
    Write-Host "ERROR: No device connected!" -ForegroundColor Red
    exit 1
}

Write-Host "Device connected!" -ForegroundColor Green
Write-Host ""

# Clear buffer
Write-Host "Clearing logcat buffer..." -ForegroundColor Yellow
adb logcat -c

# Create log file
$logFile = "crash_logs_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
Write-Host ""
Write-Host "Starting logcat capture..." -ForegroundColor Green
Write-Host "Logs will be saved to: $logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Launch the CineJoy app on your device NOW" -ForegroundColor White
Write-Host "2. Wait for the app to crash" -ForegroundColor White
Write-Host "3. Press Ctrl+C to stop capturing" -ForegroundColor White
Write-Host ""
Write-Host "Capturing... (Press Ctrl+C after crash)" -ForegroundColor Yellow
Write-Host ""

# Capture all logs to file
try {
    adb logcat -v time > $logFile
} catch {
    Write-Host ""
    Write-Host "Capture stopped." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Logs saved to: $logFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Filtering for relevant logs..." -ForegroundColor Yellow
    
    # Show filtered logs
    Get-Content $logFile | Select-String -Pattern "cinejoy|ReactNative|Error|Exception|FATAL|AndroidRuntime" -CaseSensitive:$false | Select-Object -Last 100
}

