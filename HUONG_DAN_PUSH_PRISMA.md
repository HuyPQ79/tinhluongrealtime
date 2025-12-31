# 📘 HƯỚNG DẪN PUSH PRISMA SCHEMA TỪ MÁY TÍNH CÁ NHÂN

## 🎯 Mục đích
Đồng bộ schema Prisma từ file `prisma/schema.prisma` lên database MySQL của bạn.

---

## 📋 BƯỚC 1: KIỂM TRA VÀ CHUẨN BỊ

### 1.1. Kiểm tra Prisma đã được cài đặt
Mở Terminal/PowerShell trong thư mục dự án và chạy:
```bash
npx prisma --version
```
Nếu chưa có, Prisma sẽ tự động tải về khi chạy lệnh.

### 1.2. Tạo file `.env` (nếu chưa có)
Tạo file `.env` ở thư mục gốc của dự án với nội dung:
```env
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
```

**Ví dụ cụ thể:**
```env
# MySQL Local
DATABASE_URL="mysql://root:123456@localhost:3306/hrm_realtime"

# MySQL Remote (Cloud SQL, AWS RDS, etc.)
DATABASE_URL="mysql://user:password@your-host:3306/database_name?sslaccept=strict"

# MySQL với SSL
DATABASE_URL="mysql://user:password@host:3306/db?sslmode=require"
```

**Lưu ý:**
- Thay `username`, `password`, `localhost:3306`, `database_name` bằng thông tin thực tế của bạn
- Đảm bảo database đã được tạo sẵn (Prisma không tự tạo database)
- Nếu dùng MySQL 8.0+, có thể cần thêm `?allowPublicKeyRetrieval=true`

### 1.3. Kiểm tra kết nối database
```bash
npx prisma db pull
```
Lệnh này sẽ kiểm tra kết nối. Nếu thành công, bạn sẽ thấy thông báo kết nối OK.

---

## 📋 BƯỚC 2: GENERATE PRISMA CLIENT

Trước khi push, cần generate Prisma Client để TypeScript nhận diện các model:
```bash
npx prisma generate
```

**Kết quả mong đợi:**
```
✔ Generated Prisma Client (5.12.0) to ./node_modules/.prisma/client
```

---

## 📋 BƯỚC 3: PUSH SCHEMA LÊN DATABASE

### 3.1. Phương pháp 1: `prisma db push` (Khuyến nghị cho development)

**Lệnh:**
```bash
npx prisma db push
```

**Lệnh này sẽ:**
- ✅ Đọc file `prisma/schema.prisma`
- ✅ So sánh với database hiện tại
- ✅ Tự động tạo/cập nhật/xóa tables, columns, indexes
- ✅ **KHÔNG** tạo migration files (phù hợp cho dev)
- ✅ Reset database nếu có conflict (có thể mất dữ liệu!)

**Khi chạy lệnh, bạn sẽ thấy:**
```
✔ Your database is now in sync with your Prisma schema.

The following changes have been applied:

  • CreateTable `users`
  • CreateTable `departments`
  • CreateTable `attendance_records`
  • CreateTable `salary_records`
  • ... (và các bảng khác)
```

**⚠️ CẢNH BÁO:**
- `db push` có thể **XÓA DỮ LIỆU** nếu có thay đổi lớn về cấu trúc
- Chỉ dùng cho môi trường development
- **KHÔNG** dùng cho production!

### 3.2. Phương pháp 2: `prisma migrate dev` (Khuyến nghị cho production)

**Lệnh:**
```bash
npx prisma migrate dev --name sync_schema_with_frontend
```

**Lệnh này sẽ:**
- ✅ Tạo migration files trong `prisma/migrations/`
- ✅ Áp dụng migration lên database
- ✅ Generate Prisma Client tự động
- ✅ An toàn hơn, có thể rollback

**Khi chạy lệnh:**
```
✔ Created migration `20250115_sync_schema_with_frontend` in prisma/migrations/

The following migration(s) have been applied:

migrations/
  └─ 20250115_sync_schema_with_frontend/
    └─ migration.sql

✔ Generated Prisma Client (5.12.0) to ./node_modules/.prisma/client
```

---

## 📋 BƯỚC 4: XÁC MINH KẾT QUẢ

### 4.1. Kiểm tra bằng Prisma Studio (GUI)
```bash
npx prisma studio
```
Mở trình duyệt tại `http://localhost:5555` để xem tất cả tables và dữ liệu.

### 4.2. Kiểm tra bằng lệnh
```bash
npx prisma db pull
```
Lệnh này sẽ pull schema từ database về file, bạn có thể so sánh để đảm bảo đã sync đúng.

---

## 🔧 XỬ LÝ LỖI THƯỜNG GẶP

### ❌ Lỗi 1: "Can't reach database server"
**Nguyên nhân:** Database không chạy hoặc thông tin kết nối sai.

**Giải pháp:**
1. Kiểm tra MySQL đang chạy:
   ```bash
   # Windows
   services.msc  # Tìm MySQL service
   
   # Hoặc kiểm tra bằng MySQL Workbench
   ```

2. Kiểm tra lại `DATABASE_URL` trong file `.env`

3. Test kết nối thủ công:
   ```bash
   mysql -u username -p -h localhost
   ```

### ❌ Lỗi 2: "Database does not exist"
**Nguyên nhân:** Database chưa được tạo.

**Giải pháp:**
```sql
CREATE DATABASE hrm_realtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❌ Lỗi 3: "Table already exists"
**Nguyên nhân:** Database đã có tables từ lần chạy trước.

**Giải pháp:**
- Option 1: Xóa và tạo lại (⚠️ MẤT DỮ LIỆU):
  ```bash
  npx prisma db push --force-reset
  ```

- Option 2: Dùng migrate để cập nhật an toàn:
  ```bash
  npx prisma migrate dev
  ```

### ❌ Lỗi 4: "Column cannot be null"
**Nguyên nhân:** Có cột `NOT NULL` nhưng dữ liệu cũ có giá trị `NULL`.

**Giải pháp:**
1. Cập nhật dữ liệu cũ trước:
   ```sql
   UPDATE users SET currentPosition = '' WHERE currentPosition IS NULL;
   ```

2. Hoặc thêm giá trị mặc định trong schema:
   ```prisma
   currentPosition String? @default("")
   ```

### ❌ Lỗi 5: "Syntax error" trong schema
**Nguyên nhân:** Schema có lỗi cú pháp.

**Giải pháp:**
```bash
npx prisma validate
```
Lệnh này sẽ kiểm tra và báo lỗi cụ thể.

---

## 📝 QUY TRÌNH HOÀN CHỈNH (CHECKLIST)

- [ ] **Bước 1:** Tạo/cập nhật file `.env` với `DATABASE_URL` đúng
- [ ] **Bước 2:** Kiểm tra kết nối: `npx prisma db pull`
- [ ] **Bước 3:** Validate schema: `npx prisma validate`
- [ ] **Bước 4:** Generate client: `npx prisma generate`
- [ ] **Bước 5:** Push schema:
  - Development: `npx prisma db push`
  - Production: `npx prisma migrate dev --name your_migration_name`
- [ ] **Bước 6:** Kiểm tra kết quả: `npx prisma studio`

---

## 🚀 LỆNH NHANH (QUICK REFERENCE)

```bash
# 1. Validate schema
npx prisma validate

# 2. Generate Prisma Client
npx prisma generate

# 3. Push schema (dev)
npx prisma db push

# 4. Tạo migration (production)
npx prisma migrate dev --name migration_name

# 5. Xem database (GUI)
npx prisma studio

# 6. Pull schema từ DB về file
npx prisma db pull

# 7. Reset database (⚠️ XÓA TẤT CẢ DỮ LIỆU)
npx prisma migrate reset
```

---

## 💡 LƯU Ý QUAN TRỌNG

1. **Backup database trước khi push** (đặc biệt production)
2. **Không dùng `db push` cho production** - dùng `migrate` thay thế
3. **Kiểm tra schema kỹ trước khi push** - một số thay đổi không thể rollback
4. **File `.env` không commit lên Git** - thêm vào `.gitignore`
5. **Nếu có dữ liệu quan trọng**, nên export trước:
   ```bash
   mysqldump -u username -p database_name > backup.sql
   ```

---

## 📞 HỖ TRỢ

Nếu gặp lỗi, hãy:
1. Chạy `npx prisma validate` để kiểm tra schema
2. Kiểm tra logs chi tiết với `--verbose`:
   ```bash
   npx prisma db push --verbose
   ```
3. Xem tài liệu: https://www.prisma.io/docs

---

**Chúc bạn thành công! 🎉**

