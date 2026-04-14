@echo off
title TCG kiosk - Setup

echo.
echo  ====================================================
echo   TCG kiosk - Setup and Build Script
echo  ====================================================
echo.

REM 1. Node.js check
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo  Install Node.js 18 or later from:
    echo  https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

REM 2. pnpm check
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] pnpm not found, enabling via corepack...
    corepack enable pnpm >nul 2>&1
    where pnpm >nul 2>&1
    if %errorlevel% neq 0 (
        echo [..] corepack failed, trying npm global install...
        npm install -g pnpm
        where pnpm >nul 2>&1
        if %errorlevel% neq 0 (
            echo [ERROR] pnpm install failed. Run manually:
            echo  npm install -g pnpm
            pause
            exit /b 1
        )
    )
)

for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VER=%%v
echo [OK] pnpm %PNPM_VER%

REM 3. Install dependencies
echo.
echo [..] Installing dependencies... (first run may take several minutes)
pnpm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dependency install failed.
    echo.
    echo  If this is a network/Electron download error, try:
    echo   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo   pnpm install
    echo.
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM 4. Next.js build
echo.
echo [..] Building Next.js...
pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Next.js build failed
    pause
    exit /b 1
)
echo [OK] Next.js build complete

REM 5. Electron packaging
echo.
echo [..] Packaging exe... (downloads Electron, may take several minutes)
pnpm exec electron-builder
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Packaging failed.
    echo  If Electron download timed out, try:
    echo   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo   pnpm exec electron-builder
    echo.
    pause
    exit /b 1
)

REM 6. Copy all exe files from dist to project root
echo.
echo [..] Copying exe...
set COPIED=0
for %%f in ("dist\*.exe") do (
    copy /y "%%f" . >nul
    echo [OK] Copied: %%~nxf
    set COPIED=1
)
if %COPIED%==0 (
    echo [WARN] No exe found in dist\ folder. Check dist\ manually.
)

echo.
echo  ====================================================
echo   Build complete! Run the .exe file in this folder.
echo  ====================================================
echo.
pause

