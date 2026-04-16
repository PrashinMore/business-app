# Script to enable Long Paths in Windows
# This script requires Administrator privileges
# Run: Right-click PowerShell -> Run as Administrator, then: .\enable-long-paths.ps1

Write-Host "Checking current Long Paths status..." -ForegroundColor Cyan

# Check if long paths are already enabled
$longPathsEnabled = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue).LongPathsEnabled

if ($longPathsEnabled -eq 1) {
    Write-Host "Long Paths are already enabled!" -ForegroundColor Green
    Write-Host "You may need to restart your computer for changes to take effect." -ForegroundColor Yellow
    exit 0
}

Write-Host "Enabling Long Paths..." -ForegroundColor Cyan

try {
    # Enable long paths in the registry
    New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force | Out-Null
    
    Write-Host ""
    Write-Host "✓ Long Paths enabled successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You need to RESTART YOUR COMPUTER for this change to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restarting, try building again with: npm run android:bundle" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "✗ Error: Failed to enable Long Paths" -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

