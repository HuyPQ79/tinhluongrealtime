#!/bin/bash

echo "========================================"
echo "  ĐỒNG BỘ DATABASE VỚI SCHEMA"
echo "========================================"
echo ""

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo "[ERROR] File .env không tồn tại!"
    echo ""
    echo "Vui lòng tạo file .env với nội dung:"
    echo 'DATABASE_URL="mysql://username:password@localhost:3306/database_name"'
    echo ""
    exit 1
fi

echo "[BƯỚC 1/4] Kiểm tra kết nối database..."
npx prisma db pull --preview-feature > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[ERROR] Không thể kết nối database!"
    echo "Vui lòng kiểm tra lại DATABASE_URL trong file .env"
    exit 1
fi
echo "[OK] Kết nối database thành công!"
echo ""

echo "[BƯỚC 2/4] Validate Prisma schema..."
npx prisma validate
if [ $? -ne 0 ]; then
    echo "[ERROR] Schema có lỗi! Vui lòng sửa trước khi tiếp tục."
    exit 1
fi
echo "[OK] Schema hợp lệ!"
echo ""

echo "[BƯỚC 3/4] Generate Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Generate Prisma Client thất bại!"
    exit 1
fi
echo "[OK] Prisma Client đã được generate!"
echo ""

echo "[BƯỚC 4/4] Đồng bộ schema với database..."
echo ""
echo "⚠️  CẢNH BÁO: Lệnh này sẽ thay đổi cấu trúc database!"
echo "   - Thêm các cột mới"
echo "   - Sửa các cột hiện có"
echo "   - KHÔNG xóa dữ liệu"
echo ""
read -p "Bạn có chắc muốn tiếp tục? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Đã hủy."
    exit 0
fi

npx prisma db push --accept-data-loss
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Đồng bộ thất bại!"
    echo "Vui lòng kiểm tra lại lỗi ở trên."
    exit 1
fi

echo ""
echo "========================================"
echo "  ✅ ĐỒNG BỘ THÀNH CÔNG!"
echo "========================================"
echo ""
echo "Database đã được đồng bộ với schema.prisma"
echo ""
read -p "Bạn có muốn mở Prisma Studio để xem kết quả? (y/n): " openStudio
if [ "$openStudio" == "y" ] || [ "$openStudio" == "Y" ]; then
    echo ""
    echo "Đang mở Prisma Studio..."
    echo "(Cửa sổ trình duyệt sẽ tự động mở)"
    npx prisma studio &
fi

echo ""
echo "Hoàn tất!"

