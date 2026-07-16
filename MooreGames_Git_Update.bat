@echo off
title Moore Games - Git Update
cd /d "%~dp0"

echo.
echo ===========================================
echo   Moore Games Git Update
echo ===========================================
echo.

git status

echo.
set /p MSG=Enter commit message: 

if "%MSG%"=="" (
    echo Commit message cannot be empty.
    pause
    exit /b
)

git add .
git commit -m "%MSG%"

if errorlevel 1 (
    echo.
    echo Commit failed or there was nothing to commit.
    pause
    exit /b
)

git push

echo.
echo ===========================================
echo   Done!
echo ===========================================
git status
pause
