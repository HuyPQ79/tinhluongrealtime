@echo off
chcp 65001 >nul
echo ========================================
echo   ĐỒNG BỘ DATABASE VỚI CLOUD SQL
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

echo [THÔNG TIN] Có 2 cách kết nối Cloud SQL:
echo.
echo 1. QUA CLOUD SQL PROXY (Khuyến nghị)
echo    - Chạy Cloud SQL Proxy trước: cloud_sql_proxy.exe -instances=PROJECT:REGION:INSTANCE=tcp:3306
echo    - DATABASE_URL="mysql://user:pass@localhost:3306/dbname"
echo.
echo 2. QUA PUBLIC IP (Trực tiếp)
echo    - DATABASE_URL="mysql://user:pass@PUBLIC_IP:3306/dbname"
echo.
echo 3. QUA UNIX SOCKET (Trên Cloud Run)
echo    - DATABASE_URL="mysql://user:pass@/dbname?unix_socket=/cloudsql/PROJECT:REGION:INSTANCE"
echo.
pause

echo.
echo [BƯỚC 1/5] Kiểm tra Cloud SQL Proxy đang chạy...
netstat -an | findstr ":3306" >nul
if errorlevel 1 (
    echo [WARNING] Không thấy kết nối trên port 3306!
    echo.
    echo Bạn có đang chạy Cloud SQL Proxy không?
    echo Nếu chưa, hãy chạy lệnh sau trong terminal khác:
    echo.
    echo   cloud_sql_proxy.exe -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:3306
    echo.
    echo Ví dụ:
    echo   cloud_sql_proxy.exe -instances=myproject:asia-southeast1:myinstance=tcp:3306
    echo.
    set /p continue="Bạn vẫn muốn tiếp tục? (y/n): "
    if /i not "!continue!"=="y" (
        echo Đã hủy.
        pause
        exit /b 0
    )
) else (
    echo [OK] Phát hiện kết nối trên port 3306!
)
echo.

echo [BƯỚC 2/5] Kiểm tra kết nối database...
call npx prisma db pull --preview-feature >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Không thể kết nối database!
    echo.
    echo Nguyên nhân có thể:
    echo - Cloud SQL Proxy chưa chạy
    echo - DATABASE_URL trong .env không đúng
    echo - Firewall chặn kết nối
    echo.
    echo Vui lòng kiểm tra lại:
    echo 1. Cloud SQL Proxy đang chạy?
    echo 2. DATABASE_URL trong .env đúng chưa?
    echo 3. Thử test kết nối: npx prisma db pull
    pause
    exit /b 1
)
echo [OK] Kết nối database thành công!
echo.

echo [BƯỚC 3/5] Validate Prisma schema...
call npx prisma validate
if errorlevel 1 (
    echo [ERROR] Schema có lỗi! Vui lòng sửa trước khi tiếp tục.
    pause
    exit /b 1
)
echo [OK] Schema hợp lệ!
echo.

echo [BƯỚC 4/5] Generate Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Generate Prisma Client thất bại!
    pause
    exit /b 1
)
echo [OK] Prisma Client đã được generate!
echo.

echo [BƯỚC 5/5] Đồng bộ schema với Cloud SQL...
echo.
echo ⚠️  CẢNH BÁO: Lệnh này sẽ thay đổi cấu trúc database trên Cloud SQL!
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
    echo.
    echo Nguyên nhân có thể:
    echo - Mất kết nối với Cloud SQL Proxy
    echo - Database bị lock
    echo - Schema có conflict
    echo.
    echo Vui lòng kiểm tra lại lỗi ở trên.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ ĐỒNG BỘ THÀNH CÔNG!
echo ========================================
echo.
echo Database trên Cloud SQL đã được đồng bộ với schema.prisma
echo.
set /p openStudio="Bạn có muốn mở Prisma Studio để xem kết quả? (y/n): "
if /i "%openStudio%"=="y" (
    echo.
    echo Đang mở Prisma Studio...
    echo (Cửa sổ trình duyệt sẽ tự động mở)
    echo LƯU Ý: Prisma Studio cũng cần Cloud SQL Proxy đang chạy!
    start npx prisma studio
)

echo.
pause

