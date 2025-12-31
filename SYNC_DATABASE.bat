@echo off
chcp 65001 >nul
echo ========================================
echo   ĐỒNG BỘ DATABASE VỚI SCHEMA
echo ========================================
echo.

REM Kiểm tra file .env
if not exist .env (
    echo [ERROR] File .env không tồn tại!
    echo.
    echo Vui lòng tạo file .env với nội dung:
    echo DATABASE_URL="mysql://username:password@localhost:3306/database_name"
    echo.
    pause
    exit /b 1
)

echo [BƯỚC 1/4] Kiểm tra kết nối database...
call npx prisma db pull --preview-feature >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Không thể kết nối database!
    echo Vui lòng kiểm tra lại DATABASE_URL trong file .env
    pause
    exit /b 1
)
echo [OK] Kết nối database thành công!
echo.

echo [BƯỚC 2/4] Validate Prisma schema...
call npx prisma validate
if errorlevel 1 (
    echo [ERROR] Schema có lỗi! Vui lòng sửa trước khi tiếp tục.
    pause
    exit /b 1
)
echo [OK] Schema hợp lệ!
echo.

echo [BƯỚC 3/4] Generate Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Generate Prisma Client thất bại!
    pause
    exit /b 1
)
echo [OK] Prisma Client đã được generate!
echo.

echo [BƯỚC 4/4] Đồng bộ schema với database...
echo.
echo ⚠️  CẢNH BÁO: Lệnh này sẽ thay đổi cấu trúc database!
echo    - Thêm các cột mới
echo    - Sửa các cột hiện có
echo    - KHÔNG xóa dữ liệu
echo.
set /p confirm="Bạn có chắc muốn tiếp tục? (y/n): "
if /i not "%confirm%"=="y" (
    echo Đã hủy.
    pause
    exit /b 0
)

call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo.
    echo [ERROR] Đồng bộ thất bại!
    echo Vui lòng kiểm tra lại lỗi ở trên.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ ĐỒNG BỘ THÀNH CÔNG!
echo ========================================
echo.
echo Database đã được đồng bộ với schema.prisma
echo.
set /p openStudio="Bạn có muốn mở Prisma Studio để xem kết quả? (y/n): "
if /i "%openStudio%"=="y" (
    echo.
    echo Đang mở Prisma Studio...
    echo (Cửa sổ trình duyệt sẽ tự động mở)
    start npx prisma studio
)

echo.
pause

