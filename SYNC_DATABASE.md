# 📘 HƯỚNG DẪN ĐỒNG BỘ DATABASE VỚI SCHEMA

## 🎯 CÁC CÁCH KẾT NỐI

### 1. **Local MySQL** (Development)
```bash
SYNC_DATABASE.bat
```

### 2. **Cloud SQL qua Proxy** (Khuyến nghị)
```bash
# Bước 1: Chạy Cloud SQL Proxy
START_CLOUDSQL_PROXY.bat

# Bước 2: Đồng bộ schema
SYNC_DATABASE_CLOUDSQL.bat
```

### 3. **Cloud SQL qua Public IP** (Trực tiếp)
```bash
# Cấu hình DATABASE_URL trong .env:
# DATABASE_URL="mysql://user:pass@PUBLIC_IP:3306/dbname"
SYNC_DATABASE.bat
```

---

## 🚀 CÁCH NHANH NHẤT

### Windows (Local MySQL):
```bash
SYNC_DATABASE.bat
```

### Windows (Cloud SQL):
```bash
# Terminal 1: Chạy proxy
START_CLOUDSQL_PROXY.bat

# Terminal 2: Đồng bộ schema
SYNC_DATABASE_CLOUDSQL.bat
```

### Linux/Mac:
```bash
chmod +x SYNC_DATABASE.sh
./SYNC_DATABASE.sh
```

---

## 📝 CÁC LỆNH THỦ CÔNG

### 1. Kiểm tra kết nối database
```bash
npx prisma db pull --preview-feature
```

### 2. Validate schema
```bash
npx prisma validate
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Đồng bộ schema với database
```bash
npx prisma db push
```

**Hoặc với migration (khuyến nghị cho production):**
```bash
npx prisma migrate dev --name sync_schema
```

### 5. Mở Prisma Studio để xem kết quả
```bash
npx prisma studio
```

---

## ☁️ CLOUD SQL PROXY - HƯỚNG DẪN CHI TIẾT

### Cài đặt Cloud SQL Proxy:

1. **Tải Cloud SQL Proxy:**
   - Windows: https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe
   - Đổi tên thành `cloud_sql_proxy.exe`
   - Đặt vào thư mục dự án hoặc thêm vào PATH

2. **Chạy Proxy:**
   ```bash
   # Cách 1: Dùng script
   START_CLOUDSQL_PROXY.bat
   
   # Cách 2: Thủ công
   cloud_sql_proxy.exe -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:3306
   ```

3. **Cấu hình .env:**
   ```env
   DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/DATABASE_NAME"
   ```

### Lấy thông tin Cloud SQL Instance:

1. Vào Google Cloud Console
2. SQL → Chọn instance
3. Copy **Connection name** (format: `PROJECT_ID:REGION:INSTANCE_NAME`)

---

## 🔍 KIỂM TRA SAU KHI ĐỒNG BỘ

### Xem tất cả các bảng:
```sql
SHOW TABLES;
```

### Xem cấu trúc một bảng cụ thể:
```sql
DESCRIBE users;
DESCRIBE salary_records;
DESCRIBE system_configs;
```

### Kiểm tra các cột mới đã được thêm:
```sql
-- Kiểm tra cột seniorityRules trong system_configs
SHOW COLUMNS FROM system_configs LIKE 'seniorityRules';

-- Kiểm tra cột targetField trong salary_formulas
SHOW COLUMNS FROM salary_formulas LIKE 'targetField';

-- Kiểm tra cột amount trong annual_bonus_policies
SHOW COLUMNS FROM annual_bonus_policies LIKE 'amount';
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Backup database trước khi đồng bộ:**
   ```bash
   # Local MySQL
   mysqldump -u root -p DATABASE_NAME > backup_$(date +%Y%m%d).sql
   
   # Cloud SQL (qua proxy)
   mysqldump -u root -p -h 127.0.0.1 -P 3306 DATABASE_NAME > backup.sql
   ```

2. **`db push` vs `migrate`:**
   - `db push`: Nhanh, không tạo migration history → Dùng cho **development**
   - `migrate`: Tạo migration files → Dùng cho **production**

3. **Nếu có lỗi "Column does not exist":**
   - Chạy lại `npx prisma db push`
   - Hoặc tạo migration: `npx prisma migrate dev --name add_missing_columns`

4. **Cloud SQL Proxy:**
   - Phải chạy proxy TRƯỚC khi chạy sync
   - Giữ cửa sổ proxy mở trong khi làm việc
   - Proxy chạy trên `localhost:3306` (mặc định)

---

## 🎯 CÁC CỘT MỚI SẼ ĐƯỢC THÊM

Sau khi đồng bộ, các cột sau sẽ được thêm vào database:

### `system_configs`:
- ✅ `seniorityRules` (JSON)
- ✅ `pitSteps` (JSON)
- ✅ `insuranceRules` (JSON)

### `salary_formulas`:
- ✅ `targetField` (VARCHAR, nullable)

### `annual_bonus_policies`:
- ✅ `bonusTypeId` (VARCHAR, nullable)
- ✅ `rankId` (VARCHAR, nullable)
- ✅ `gradeId` (VARCHAR, nullable)
- ✅ `amount` (DECIMAL)

### `bonus_types`:
- ✅ `month` (INT, nullable)
- ✅ `description` (TEXT, nullable)

### `users`:
- ✅ `assignedDeptIds` (JSON, nullable)
- ✅ `activeAssignments` (JSON, nullable)
- ✅ `salaryHistory` (JSON, nullable)

### `evaluation_requests`:
- ⚠️ `userName` đã được XÓA (computed field, không lưu DB)

---

## ✅ CHECKLIST

Trước khi chạy:
- [ ] File `.env` đã có `DATABASE_URL` đúng
- [ ] MySQL server đang chạy (local) HOẶC Cloud SQL Proxy đang chạy (Cloud SQL)
- [ ] Đã backup database (nếu có dữ liệu quan trọng)
- [ ] Schema đã được validate (`npx prisma validate`)

Sau khi chạy:
- [ ] Kiểm tra Prisma Studio: `npx prisma studio`
- [ ] Test API endpoints
- [ ] Kiểm tra log server không có lỗi 500

---

## 🆘 XỬ LÝ LỖI

### Lỗi: "Can't reach database server"
```bash
# Local MySQL: Kiểm tra MySQL đang chạy
# Windows: services.msc → Tìm "MySQL"
# Linux: sudo systemctl status mysql

# Cloud SQL: Kiểm tra Cloud SQL Proxy đang chạy
netstat -an | findstr ":3306"
```

### Lỗi: "Table already exists"
- Prisma sẽ tự động merge, không cần lo lắng

### Lỗi: "Column cannot be null"
- Thêm `@default(...)` vào schema
- Hoặc chạy với `--accept-data-loss`

### Lỗi: "Cloud SQL Proxy connection failed"
- Kiểm tra credentials (service account key)
- Kiểm tra instance name đúng chưa
- Kiểm tra firewall rules trên Cloud SQL

---

**Chúc bạn thành công! 🚀**
