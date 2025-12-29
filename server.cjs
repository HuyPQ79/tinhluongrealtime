// --- 1. GÀI BẪY BẮT LỖI (Quan trọng nhất) ---
// Phải đặt ngay dòng đầu tiên để bắt mọi lỗi sập nguồn
process.on('uncaughtException', (err) => {
  console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
  console.error(err.stack); // In ra vị trí lỗi
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("--> [1/6] Bắt đầu nạp thư viện...");

// --- 2. NẠP THƯ VIỆN TỪNG BƯỚC ---
try {
  var express = require('express');
  console.log("--> [2/6] Đã nạp Express");
  
  var cors = require('cors');
  console.log("--> [3/6] Đã nạp CORS");
  
  var path = require('path');
  var fs = require('fs');
  console.log("--> [4/6] Đã nạp Path & FS");
} catch (e) {
  console.error("🔥 LỖI NẠP THƯ VIỆN:", e);
  process.exit(1);
}

const app = express();
// Ép kiểu số an toàn tuyệt đối
const PORT = Number(process.env.PORT) || 8080; 

app.use(cors());
app.use(express.json());

// --- 3. KIỂM TRA FILE GIAO DIỆN ---
const staticPath = path.join(process.cwd(), 'dist');
console.log(`--> [5/6] Kiểm tra thư mục dist: ${staticPath}`);

let hasFrontend = false;
try {
  if (fs.existsSync(staticPath)) {
    console.log("    -> Dist tồn tại.");
    app.use(express.static(staticPath));
    hasFrontend = true;
  } else {
    console.error("    -> CẢNH BÁO: Không thấy thư mục dist!");
  }
} catch (e) {
  console.error("🔥 Lỗi khi kiểm tra file:", e);
}

// --- 4. KẾT NỐI PRISMA AN TOÀN ---
let prisma;
try {
  console.log("--> [6/6] Khởi tạo Prisma...");
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log("    -> Prisma Client OK.");
} catch (e) {
  console.error("⚠️ Lỗi khởi tạo Prisma (App vẫn chạy tiếp):", e.message);
}

// --- 5. API PING (Để Health Check) ---
app.get('/api/ping', (req, res) => {
  res.json({ status: "OK", time: new Date() });
});

app.get('/', (req, res) => {
  if (hasFrontend) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    res.send("<h1>Server Backend đang chạy (Chưa có Frontend)</h1>");
  }
});

// --- 6. KHỞI ĐỘNG ---
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ SERVER ĐÃ CHẠY THÀNH CÔNG TẠI PORT ${PORT}`);
  });
} catch (e) {
  console.error("🔥 LỖI KHI MỞ CỔNG SERVER:", e);
}
