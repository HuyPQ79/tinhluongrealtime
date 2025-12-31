# 📘 HƯỚNG DẪN CHI TIẾT: PUSH PRISMA SCHEMA TỪ MÁY TÍNH CÁ NHÂN

## 🎯 Mục đích
Áp dụng các thay đổi trong file `schema.prisma` vào database MySQL của bạn.

---

## 📋 BƯỚC 1: KIỂM TRA MÔI TRƯỜNG

### 1.1. Kiểm tra Node.js và npm đã cài đặt
Mở **PowerShell** hoặc **Command Prompt** và chạy:

```bash
node --version
npm --version
```

**Kết quả mong đợi:** Hiển thị version (ví dụ: v20.x.x và 10.x.x)

### 1.2. Kiểm tra Prisma đã cài đặt
```bash
npx prisma --version
```

**Kết quả mong đợi:** Hiển thị version Prisma (ví dụ: 5.12.0)

---

## 📋 BƯỚC 2: CẤU HÌNH DATABASE CONNECTION

### 2.1. Tạo file `.env` (nếu chưa có)

Trong thư mục gốc dự án (`tinhluongrealtime`), tạo file `.env` với nội dung:

```env
# Database Connection
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public"

# Ví dụ cụ thể:
# DATABASE_URL="mysql://root:123456@localhost:3306/hrm_db"
# DATABASE_URL="mysql://admin:mypassword@127.0.0.1:3306/hrm_realtime"
```

**Giải thích:**
- `USERNAME`: Tên đăng nhập MySQL (thường là `root`)
- `PASSWORD`: Mật khẩu MySQL
- `HOST`: Địa chỉ server (localhost hoặc 127.0.0.1 nếu chạy local)
- `PORT`: Cổng MySQL (mặc định là 3306)
- `DATABASE_NAME`: Tên database bạn muốn sử dụng

### 2.2. Kiểm tra kết nối database

Chạy lệnh để test kết nối:

```bash
npx prisma db pull --preview-feature
```

Nếu kết nối thành công, bạn sẽ thấy thông báo tương tự:
```
✔ Introspected 15 models and wrote them into schema.prisma in XXXms
```

**Nếu lỗi kết nối:**
- Kiểm tra lại thông tin trong `.env`
- Đảm bảo MySQL đang chạy
- Kiểm tra firewall/antivirus có chặn port 3306 không

---

## 📋 BƯỚC 3: VALIDATE SCHEMA TRƯỚC KHI PUSH

### 3.1. Kiểm tra syntax schema

```bash
npm run db:validate
```

Hoặc:

```bash
npx prisma validate
```

**Kết quả mong đợi:**
```
✔ The Prisma schema is valid!
```

**Nếu có lỗi:** Sửa các lỗi được báo trước khi tiếp tục.

---

## 📋 BƯỚC 4: GENERATE PRISMA CLIENT

### 4.1. Tạo Prisma Client từ schema mới

```bash
npm run db:generate
```

Hoặc:

```bash
npx prisma generate
```

**Kết quả mong đợi:**
```
✔ Generated Prisma Client (5.12.0) to .\node_modules\@prisma\client in XXXms
```

---

## 📋 BƯỚC 5: PUSH SCHEMA VÀO DATABASE

### 5.1. Push schema (Khuyến nghị cho development)

**Lệnh chính:**

```bash
npm run db:push
```

Hoặc:

```bash
npx prisma db push
```

**Quá trình sẽ:**
1. ✅ So sánh schema hiện tại với database
2. ✅ Tạo các bảng mới nếu chưa có
3. ✅ Thêm các cột mới vào bảng hiện có
4. ✅ Cập nhật các ràng buộc (constraints, indexes)
5. ⚠️ **KHÔNG XÓA** dữ liệu hiện có (chỉ thêm/sửa)

**Kết quả mong đợi:**
```
✔ Your database is now in sync with your Prisma schema.

The following changes have been applied:

  • Added table `new_table_name`
  • Added column `new_column` to table `existing_table`
  • Updated column `column_name` in table `table_name`

✔ Generated Prisma Client (5.12.0) to .\node_modules\@prisma\client in XXXms
```

### 5.2. Xác nhận thay đổi

Khi Prisma hỏi xác nhận, nhập `y` hoặc `yes`:

```
? Are you sure you want to apply these changes? (y/N)
```

---

## 📋 BƯỚC 6: KIỂM TRA KẾT QUẢ

### 6.1. Mở Prisma Studio (GUI để xem database)

```bash
npm run db:studio
```

Hoặc:

```bash
npx prisma studio
```

**Kết quả:**
- Mở trình duyệt tại `http://localhost:5555`
- Bạn có thể xem tất cả các bảng và dữ liệu

### 6.2. Kiểm tra bằng code

Chạy server để test:

```bash
npm start
```

Kiểm tra các API endpoint có hoạt động không.

---

## 🔄 PHƯƠNG PHÁP THAY THẾ: MIGRATE (Cho Production)

Nếu bạn muốn tạo migration history (khuyến nghị cho production):

### Bước 1: Tạo migration

```bash
npm run db:migrate
```

Hoặc:

```bash
npx prisma migrate dev --name sync_schema_with_frontend
```

**Lệnh này sẽ:**
- ✅ Tạo file migration trong `prisma/migrations/`
- ✅ Áp dụng migration vào database
- ✅ Generate Prisma Client

**Kết quả:**
```
✔ Created migration `20250101_sync_schema_with_frontend` in XXXms
✔ Applied migration `20250101_sync_schema_with_frontend` in XXXms
✔ Generated Prisma Client (5.12.0) to .\node_modules\@prisma\client in XXXms
```

---

## ⚠️ XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 1: "Can't reach database server"

**Nguyên nhân:** Không kết nối được MySQL

**Giải pháp:**
1. Kiểm tra MySQL đang chạy:
   ```bash
   # Windows (Services)
   services.msc
   # Tìm "MySQL" và đảm bảo đang "Running"
   ```

2. Kiểm tra lại `DATABASE_URL` trong `.env`

3. Test kết nối bằng MySQL client:
   ```bash
   mysql -u root -p -h localhost
   ```

### Lỗi 2: "Table already exists"

**Nguyên nhân:** Bảng đã tồn tại trong database

**Giải pháp:**
- Prisma sẽ tự động merge, không cần lo lắng
- Nếu muốn reset hoàn toàn (⚠️ XÓA DỮ LIỆU):
  ```bash
  npm run db:reset
  ```

### Lỗi 3: "Column cannot be null"

**Nguyên nhân:** Cột mới không có giá trị mặc định nhưng bảng đã có dữ liệu

**Giải pháp:**
- Thêm `@default(...)` vào schema
- Hoặc xóa dữ liệu cũ trước khi push

### Lỗi 4: "Syntax error in schema"

**Nguyên nhân:** Lỗi cú pháp trong `schema.prisma`

**Giải pháp:**
```bash
npx prisma validate
```
Sửa các lỗi được báo.

### Lỗi 5: "Binary target not found"

**Nguyên nhân:** Prisma Client chưa được generate cho platform hiện tại

**Giải pháp:**
```bash
npx prisma generate
```

---

## 📝 CHECKLIST HOÀN CHỈNH

Trước khi push, đảm bảo:

- [ ] ✅ File `.env` đã được tạo và có `DATABASE_URL` đúng
- [ ] ✅ MySQL server đang chạy
- [ ] ✅ Có thể kết nối đến database
- [ ] ✅ Schema đã được validate (`npx prisma validate`)
- [ ] ✅ Đã backup database (nếu có dữ liệu quan trọng)
- [ ] ✅ Đã đọc kỹ các thay đổi sẽ được áp dụng

---

## 🚀 LỆNH NHANH (TÓM TẮT)

```bash
# 1. Validate schema
npx prisma validate

# 2. Generate client
npx prisma generate

# 3. Push schema (Development)
npx prisma db push

# HOẶC

# 3. Tạo migration (Production)
npx prisma migrate dev --name sync_schema_with_frontend

# 4. Mở Prisma Studio để kiểm tra
npx prisma studio
```

---

## 💡 LƯU Ý QUAN TRỌNG

1. **`db push`** vs **`migrate`**:
   - `db push`: Nhanh, không tạo migration history → Dùng cho **development**
   - `migrate`: Tạo migration files → Dùng cho **production**

2. **Backup trước khi push:**
   ```bash
   # Export database
   mysqldump -u root -p DATABASE_NAME > backup.sql
   ```

3. **Không xóa dữ liệu:**
   - `db push` chỉ **thêm/sửa**, không xóa dữ liệu
   - Nếu muốn reset hoàn toàn: `npx prisma migrate reset` (⚠️ XÓA TẤT CẢ)

4. **Schema location:**
   - Prisma sẽ đọc từ `prisma/schema.prisma` (không phải `schema.prisma` ở root)

---

## 🎉 HOÀN TẤT!

Sau khi push thành công, bạn có thể:
- ✅ Sử dụng Prisma Client trong code
- ✅ Chạy server và test API
- ✅ Xem dữ liệu bằng Prisma Studio

**Chúc bạn thành công! 🚀**
