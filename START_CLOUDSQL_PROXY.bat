@echo off
chcp 65001 >nul
echo ========================================
echo   KHỞI ĐỘNG CLOUD SQL PROXY
echo ========================================
echo.

REM Kiểm tra cloud_sql_proxy.exe có tồn tại không
where cloud_sql_proxy.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Không tìm thấy cloud_sql_proxy.exe!
    echo.
    echo Vui lòng:
    echo 1. Tải Cloud SQL Proxy từ: https://cloud.google.com/sql/docs/mysql/sql-proxy
    echo 2. Đặt file cloud_sql_proxy.exe vào thư mục này
    echo 3. Hoặc thêm vào PATH
    echo.
    pause
    exit /b 1
)

echo [THÔNG TIN] Cần thông tin kết nối Cloud SQL:
echo.
set /p PROJECT_ID="Nhập PROJECT_ID: "
set /p REGION="Nhập REGION (ví dụ: asia-southeast1): "
set /p INSTANCE_NAME="Nhập INSTANCE_NAME: "
set /p PORT="Nhập PORT (mặc định 3306): "

if "%PORT%"=="" set PORT=3306

echo.
echo [THÔNG TIN KẾT NỐI]
echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo Instance: %INSTANCE_NAME%
echo Port: %PORT%
echo.
echo Connection string: %PROJECT_ID%:%REGION%:%INSTANCE_NAME%
echo.

REM Kiểm tra port đã được sử dụng chưa
netstat -an | findstr ":%PORT%" >nul
if not errorlevel 1 (
    echo [WARNING] Port %PORT% đã được sử dụng!
    echo Có thể Cloud SQL Proxy đã chạy rồi.
    echo.
    set /p continue="Bạn vẫn muốn tiếp tục? (y/n): "
    if /i not "!continue!"=="y" (
        echo Đã hủy.
        pause
        exit /b 0
    )
)

echo.
echo [KHỞI ĐỘNG] Đang chạy Cloud SQL Proxy...
echo.
echo LƯU Ý:
echo - Giữ cửa sổ này mở để proxy tiếp tục chạy
echo - Để dừng proxy, nhấn Ctrl+C
echo - Sau khi proxy chạy, bạn có thể chạy SYNC_DATABASE_CLOUDSQL.bat
echo.

cloud_sql_proxy.exe -instances=%PROJECT_ID%:%REGION%:%INSTANCE_NAME%=tcp:%PORT%

pause

