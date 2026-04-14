@echo off
chcp 65001 >nul
title TCG 매입 키오스크 - 설치 및 빌드

echo.
echo  ====================================================
echo   TCG 매입 키오스크 - 환경 설정 및 빌드 스크립트
echo  ====================================================
echo.

REM ── 1. Node.js 확인 ──────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js 가 설치되어 있지 않습니다.
    echo.
    echo  아래 주소에서 Node.js 18 이상을 설치해 주세요:
    echo  https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

REM ── 2. pnpm 확인 / 활성화 ────────────────────────────
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] pnpm 이 없습니다. corepack 으로 활성화 시도...
    corepack enable pnpm >nul 2>&1
    where pnpm >nul 2>&1
    if %errorlevel% neq 0 (
        echo [..] corepack 실패. npm 전역 설치 시도...
        npm install -g pnpm
        where pnpm >nul 2>&1
        if %errorlevel% neq 0 (
            echo [오류] pnpm 설치에 실패했습니다. 수동으로 설치해 주세요:
            echo  npm install -g pnpm
            pause
            exit /b 1
        )
    )
)

for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VER=%%v
echo [OK] pnpm %PNPM_VER%

REM ── 3. 의존성 설치 ───────────────────────────────────
echo.
echo [..] 의존성 설치 중... (첫 실행 시 수 분 소요)
pnpm install
if %errorlevel% neq 0 (
    echo.
    echo [오류] 의존성 설치에 실패했습니다.
    echo.
    echo  네트워크 문제라면 아래를 시도해 보세요:
    echo   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo   pnpm install
    echo.
    pause
    exit /b 1
)
echo [OK] 의존성 설치 완료

REM ── 4. Next.js 빌드 ──────────────────────────────────
echo.
echo [..] Next.js 빌드 중...
pnpm build
if %errorlevel% neq 0 (
    echo [오류] Next.js 빌드 실패
    pause
    exit /b 1
)
echo [OK] Next.js 빌드 완료

REM ── 5. Electron 패키징 ───────────────────────────────
echo.
echo [..] exe 패키징 중... (Electron 다운로드 포함, 수 분 소요)
pnpm exec electron-builder
if %errorlevel% neq 0 (
    echo.
    echo [오류] 패키징 실패. Electron 다운로드 오류라면:
    echo   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo   pnpm exec electron-builder
    echo.
    pause
    exit /b 1
)

REM ── 6. exe 복사 ──────────────────────────────────────
echo.
echo [..] exe 파일 복사 중...
if exist "dist\TCG 매입 키오스크 0.1.0.exe" (
    copy /y "dist\TCG 매입 키오스크 0.1.0.exe" "TCG 매입 키오스크.exe" >nul
    echo [OK] TCG 매입 키오스크.exe 생성 완료
) else (
    echo [경고] dist 폴더에서 exe 를 찾지 못했습니다. dist\ 폴더를 확인하세요.
)

echo.
echo  ====================================================
echo   빌드 완료!
echo   TCG 매입 키오스크.exe 를 실행하세요.
echo  ====================================================
echo.
pause
