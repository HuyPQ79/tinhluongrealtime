#!/bin/bash
# ==========================================
# Script tự động push Prisma schema (Linux/Mac)
# ==========================================

echo ""
echo "========================================"
echo "  PUSH PRISMA SCHEMA TO DATABASE"
echo "========================================"
echo ""

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo "[ERROR] File .env không tồn tại!"
    echo ""
    echo "Vui lòng tạo file .env từ .env.example và điền thông tin database."
    echo ""
    exit 1
fi

echo "[1/4] Validating Prisma schema..."
npx prisma validate
if [ $? -ne 0 ]; then
    echo "[ERROR] Schema validation failed!"
    exit 1
fi
echo "[OK] Schema is valid!"
echo ""

echo "[2/4] Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to generate Prisma Client!"
    exit 1
fi
echo "[OK] Prisma Client generated!"
echo ""

echo "[3/4] Pushing schema to database..."
echo "[WARNING] This will modify your database structure!"
echo ""
npx prisma db push
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to push schema!"
    exit 1
fi
echo "[OK] Schema pushed successfully!"
echo ""

echo "[4/4] Opening Prisma Studio..."
echo "[INFO] Prisma Studio will open in your browser."
echo "[INFO] Press Ctrl+C to close Prisma Studio when done."
echo ""
sleep 2
npx prisma studio &

echo ""
echo "========================================"
echo "  HOÀN TẤT! Database đã được cập nhật."
echo "========================================"
echo ""

