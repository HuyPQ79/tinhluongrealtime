const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log("=== SERVER ĐANG KHỞI ĐỘNG (CHẾ ĐỘ DEBUG) ===");

const app = express();
// Ép kiểu số để tránh lỗi cổng
const PORT = parseInt(process.env.PORT || '8080');

app.use(cors());
app.use(express.json());

// --- 1. KIỂM TRA THƯ MỤC GIAO DIỆN (DIST) ---
// Server sẽ tìm file giao diện ở thư mục 'dist'
const staticPath = path.join(process.cwd(), 'dist');
console.log(`[CHECK] Đang tìm giao diện tại: ${staticPath}`);

let hasFrontend = false;
if (fs.existsSync(staticPath)) {
  console.log("--> [OK] Đã tìm thấy thư mục 'dist'.");
  // Kiểm tra xem có file index.html không
  if (fs.existsSync(path.join(staticPath, 'index.html'))) {
     console.log("--> [OK] Đã tìm thấy file index.html.");
     hasFrontend = true;
     app.use(express.static(staticPath));
  } else {
     console.error("--> [CẢNH BÁO] Có thư mục dist nhưng KHÔNG thấy index.html!");
  }
} else {
  console.error("--> [LỖI] KHÔNG TÌM THẤY THƯ MỤC 'dist'!");
  console.error("--> Lý do: Có thể lệnh 'npm run build' chưa chạy hoặc file vite.config.ts chưa cấu hình output.");
}

// --- 2. KẾT NỐI DATABASE AN TOÀN (KHÔNG ĐỂ SẬP APP) ---
let prisma;
try {
  console.log("[CHECK] Đang khởi tạo Prisma Client...");
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log("--> [OK] Prisma Client đã khởi tạo (kết nối sẽ được thực hiện khi có request).");
} catch (e) {
  console.error("--> [LỖI] Không thể khởi tạo Prisma:", e.message);
  // Server vẫn tiếp tục chạy, không crash!
}

// --- 3. API HEALTH CHECK (Để Google biết server còn sống) ---
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: "Alive", 
    frontend: hasFrontend ? "Loaded" : "Missing",
    db: prisma ? "Initialized" : "Failed"
  });
});

// --- API LOGIN (Mẫu) ---
app.post('/api/login', async (req, res) => {
  if (!prisma) return res.status(500).json({ error: "Lỗi kết nối DB server" });
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (user && user.password === password) {
       const jwt = require('jsonwebtoken');
       const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret');
       res.json({ success: true, token, user });
    } else {
       res.status(401).json({ success: false });
    }
  } catch (e) {
    console.error("Lỗi login:", e);
    res.status(500).json({ error: "Lỗi xử lý đăng nhập" });
  }
});

// --- 4. PHỤC VỤ GIAO DIỆN (FALLBACK) ---
app.get('*', (req, res) => {
  if (hasFrontend) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    // Nếu lỗi build, hiện thông báo tạm để biết server vẫn sống
    res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: green;">Server Backend Đang Chạy! (Port ${PORT})</h1>
        <h2 style="color: red;">Tuy nhiên, không tìm thấy giao diện Frontend.</h2>
        <p>Vui lòng kiểm tra lại quá trình Build trên Cloud Run.</p>
        <p>Log chi tiết đã được ghi lại trong Google Cloud Logs.</p>
      </div>
    `);
  }
});

// --- KHỞI ĐỘNG ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend HRM đang lắng nghe tại cổng ${PORT}`);
});
