@echo off
REM ==========================================
REM Script tự động push Prisma schema
REM ==========================================

echo.
echo ========================================
echo   PUSH PRISMA SCHEMA TO DATABASE
echo ========================================
echo.

REM Kiểm tra file .env
if not exist .env (
    echo [ERROR] File .env không tồn tại!
    echo.
    echo Vui lòng tạo file .env từ .env.example và điền thông tin database.
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
echo [OK] Schema is valid!
echo.

echo [2/4] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Failed to generate Prisma Client!
    pause
    exit /b 1
)
echo [OK] Prisma Client generated!
echo.

echo [3/4] Pushing schema to database...
echo [WARNING] This will modify your database structure!
echo.
call npx prisma db push
if errorlevel 1 (
    echo [ERROR] Failed to push schema!
    pause
    exit /b 1
)
echo [OK] Schema pushed successfully!
echo.

echo [4/4] Opening Prisma Studio...
echo [INFO] Prisma Studio will open in your browser.
echo [INFO] Press Ctrl+C to close Prisma Studio when done.
echo.
timeout /t 2 /nobreak >nul
start npx prisma studio

echo.
echo ========================================
echo   HOAN TAT! Database da duoc cap nhat.
echo ========================================
echo.
pause

