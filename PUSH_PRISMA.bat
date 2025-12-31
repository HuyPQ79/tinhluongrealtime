@echo off
echo ========================================
echo   PUSH PRISMA SCHEMA TO DATABASE
echo ========================================
echo.

REM Kiểm tra file .env
if not exist .env (
    echo [ERROR] File .env khong ton tai!
    echo.
    echo Vui long tao file .env voi noi dung:
    echo DATABASE_URL="mysql://username:password@localhost:3306/database_name"
    echo.
    echo Hoac copy tu file .env.example:
    echo copy .env.example .env
    echo.
    pause
    exit /b 1
)

echo [1/4] Validating Prisma schema...
call npx prisma validate
if errorlevel 1 (
    echo [ERROR] Schema validation failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Generate failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Pushing schema to database...
echo WARNING: This may modify your database structure!
echo.
set /p confirm="Ban co chac muon tiep tuc? (y/n): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

call npx prisma db push
if errorlevel 1 (
    echo [ERROR] Push failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Opening Prisma Studio...
echo Database schema da duoc push thanh cong!
echo.
set /p openStudio="Ban co muon mo Prisma Studio de xem ket qua? (y/n): "
if /i "%openStudio%"=="y" (
    start npx prisma studio
)

echo.
echo ========================================
echo   HOAN TAT!
echo ========================================
pause

