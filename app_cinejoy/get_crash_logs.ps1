# PowerShell script to capture crash logs for CineJoy app
# Run this script, then launch the app on your device to capture crash logs

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CineJoy Crash Log Capture Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if device is connected
Write-Host "Checking for connected devices..." -ForegroundColor Yellow
$devicesOutput = adb devices 2>&1 | Out-String
if ($devicesOutput -match "\tdevice\s*$" -or $devicesOutput -match "device\s*$") {
    Write-Host "Device connected!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: No device connected or device is unauthorized!" -ForegroundColor Red
    Write-Host "Current output:" -ForegroundColor Yellow
    Write-Host $devicesOutput -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Connect your phone via USB" -ForegroundColor Yellow
    Write-Host "2. Enable USB Debugging" -ForegroundColor Yellow
    Write-Host "3. Authorize the computer when prompted" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run 'adb devices' to check connection manually." -ForegroundColor Cyan
    exit 1
}

# Clear logcat buffer
Write-Host "Clearing logcat buffer..." -ForegroundColor Yellow
adb logcat -c

Write-Host ""
Write-Host "Starting logcat capture for com.cinejoy.app..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Launch the CineJoy app on your device NOW" -ForegroundColor White
Write-Host "2. Wait for the app to crash" -ForegroundColor White
Write-Host "3. Press Ctrl+C to stop capturing after crash" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Filter for app-specific logs and crash-related messages
# Capture all logs first, then filter - this ensures we don't miss anything
Write-Host "Capturing logs... (Press Ctrl+C after app crashes)" -ForegroundColor Yellow
Write-Host ""

try {
    adb logcat -v time *:E AndroidRuntime:E ReactNativeJS:V com.cinejoy.app:V | ForEach-Object {
        $line = $_
        if ($line -match "cinejoy|ReactNative|ReactNativeJS|Error|Exception|FATAL|AndroidRuntime|crash|Crash" -or 
            $line -match "com\.cinejoy\.app") {
            Write-Host $line
        }
    }
} catch {
    Write-Host ""
    Write-Host "Capture stopped." -ForegroundColor Yellow
}

