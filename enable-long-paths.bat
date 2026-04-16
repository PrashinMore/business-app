@echo off
echo ========================================
echo Enable Windows Long Paths
echo ========================================
echo.
echo This script requires Administrator privileges.
echo If the window title doesn't say "Administrator", 
echo please right-click and select "Run as administrator"
echo.
pause
echo.
echo Enabling Long Paths...
powershell -Command "New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1 -PropertyType DWORD -Force" 2>nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Long Paths have been enabled.
    echo ========================================
    echo.
    echo IMPORTANT: You MUST RESTART YOUR COMPUTER
    echo for this change to take effect.
    echo.
    echo After restarting, run: npm run android:bundle
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to enable Long Paths
    echo ========================================
    echo.
    echo Please make sure you're running this as Administrator!
    echo Right-click the file and select "Run as administrator"
    echo.
)
pause

