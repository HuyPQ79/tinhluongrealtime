import express from 'express';
import cors from 'cors';
import * as path from 'path';

// --- LOG KHỞI ĐỘNG ---
console.log("=== SERVER ĐANG KHỞI ĐỘNG Ở CHẾ ĐỘ SAFE MODE ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');

app.use(cors());
app.use(express.json());

// --- API TEST ĐƠN GIẢN (KHÔNG DÙNG DB) ---
app.get('/api/ping', (req, res) => {
  res.json({ message: "Server đang sống khỏe mạnh!", time: new Date() });
});

// --- PHẦN QUAN TRỌNG: PHỤC VỤ GIAO DIỆN WEB ---
// Sử dụng đường dẫn tuyệt đối để tránh lỗi không tìm thấy file
const staticPath = path.resolve(process.cwd());
console.log("Đang phục vụ file tĩnh từ thư mục:", staticPath);

app.use(express.static(staticPath));

// Bắt tất cả đường dẫn còn lại trả về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend HRM đã chạy thành công tại cổng ${PORT}`);
});
