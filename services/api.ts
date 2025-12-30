import { 
    User, Department, SalaryRecord, AttendanceRecord, SystemConfig, 
    SalaryFormula, SalaryVariable, Criterion, CriterionGroup, 
    PieceworkConfig, SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, 
    AuditLog, EvaluationRequest 
} from '../types';

// --- CẤU HÌNH ĐƯỜNG DẪN API ---
// Nếu đang chạy trên Cloud (Production) -> Dùng đường dẫn tương đối /api
// Nếu đang chạy dưới máy (Development) -> Trỏ thẳng vào port 8080
const IS_PROD = import.meta.env.PROD;
const API_BASE = IS_PROD ? '/api' : 'http://localhost:8080/api';

console.log(`[API] Đang kết nối tới: ${API_BASE}`);

// --- HELPER: Gửi Request có kèm Token ---
const request = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('HRM_TOKEN');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Nếu lỗi 401 (Hết phiên đăng nhập) -> Đá về login
            if (response.status === 401) {
                localStorage.removeItem('HRM_TOKEN');
                localStorage.removeItem('HRM_USER');
                // window.location.href = '/#/login'; // Bỏ comment nếu muốn auto redirect
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API FAIL] ${endpoint}:`, error);
        throw error;
    }
};

export const api = {
    // ==================================================
    // 1. AUTHENTICATION (Đăng nhập)
    // ==================================================
    async login(username: string, password: string): Promise<User | null> {
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Lưu Token và User vào LocalStorage để App dùng
                    localStorage.setItem('HRM_TOKEN', data.token);
                    localStorage.setItem('HRM_USER', JSON.stringify(data.user));
                    return data.user;
                }
            }
            return null;
        } catch (e) {
            console.error("Lỗi đăng nhập:", e);
            return null;
        }
    },

    async logout() {
        localStorage.removeItem('HRM_TOKEN');
        localStorage.removeItem('HRM_USER');
    },

    // ==================================================
    // 2. USER & DEPARTMENT MANAGEMENT
    // ==================================================
    async getUsers() {
        return await request('/users');
    },

    async saveUser(user: User) {
        return await request('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    },

    async deleteUser(id: string) {
        return await request(`/users/${id}`, { method: 'DELETE' });
    },

    async getDepartments() {
        return await request('/departments');
    },

    async saveDepartment(dept: Department) {
        return await request('/departments', {
            method: 'POST',
            body: JSON.stringify(dept)
        });
    },

    async deleteDepartment(id: string) {
        return await request(`/departments/${id}`, { method: 'DELETE' });
    },

    // ==================================================
    // 3. ATTENDANCE (Chấm công)
    // ==================================================
    async getAttendance(month?: string) {
        const query = month ? `?month=${month}` : '';
        return await request(`/attendance${query}`);
    },

    async saveAttendance(data: AttendanceRecord | AttendanceRecord[]) {
        return await request('/attendance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // ==================================================
    // 4. SALARY RECORDS (Bảng lương)
    // ==================================================
    async getSalaryRecords(month?: string) {
        const query = month ? `?month=${month}` : '';
        return await request(`/salary-records${query}`);
    },

    async saveSalaryRecord(record: SalaryRecord) {
        return await request('/salary-records', {
            method: 'POST',
            body: JSON.stringify(record)
        });
    },

    // ==================================================
    // 5. CONFIGURATION & MASTER DATA
    // ==================================================
    
    async getSystemConfig() {
        return await request('/config/system');
    },

    // Hàm saveConfig đa năng (Xử lý mapping sang các API riêng biệt)
    async saveConfig(key: string, data: any) {
        try {
            // Mapping key từ AppContext sang API Endpoint
            let endpoint = '';
            switch(key) {
                case 'formulas': endpoint = '/formulas'; break;
                case 'criteria': endpoint = '/criteria/items'; break;
                case 'groups':   endpoint = '/criteria/groups'; break; // Lưu ý: AppContext cần sửa key này nếu chưa khớp
                case 'variables':endpoint = '/variables'; break;
                case 'ranks':    endpoint = '/ranks'; break;
                case 'piecework':endpoint = '/piecework-configs'; break;
                case 'holidays': endpoint = '/holidays'; break;
                case 'bonusTypes': endpoint = '/bonus-types'; break;
                case 'annualPolicies': endpoint = '/bonus-policies'; break;
                case 'dailyWork': endpoint = '/daily-work-items'; break;
                case 'system':    
                    // System config là object đơn, không phải mảng
                    return await request('/config/system', { method: 'POST', body: JSON.stringify(data) });
                default: 
                    console.warn(`Unknown config key: ${key}`);
                    return { success: false };
            }

            // XỬ LÝ MẢNG DỮ LIỆU:
            // Vì AppContext thường gửi TOÀN BỘ danh sách (Array),
            // nhưng API backend của chúng ta thiết kế để lưu từng item (Upsert).
            // Ta sẽ gửi từng request song song (Promise.all) để đảm bảo dữ liệu đồng bộ.
            if (Array.isArray(data)) {
                await Promise.all(data.map(item => 
                    request(endpoint, { method: 'POST', body: JSON.stringify(item) })
                ));
            } else {
                // Nếu gửi 1 object
                await request(endpoint, { method: 'POST', body: JSON.stringify(data) });
            }
            
            return { success: true };
        } catch (e) {
            console.error(`Save config failed [${key}]:`, e);
            return { success: false };
        }
    },

    // ==================================================
    // 6. LOGS & EVALUATIONS (Nhật ký & Đánh giá)
    // ==================================================
    async getLogs() {
        return await request('/audit');
    },

    async saveLog(log: AuditLog) {
        return await request('/audit', {
            method: 'POST',
            body: JSON.stringify(log)
        });
    },

    async getEvaluations() {
        return await request('/evaluations');
    },

    async saveEvaluation(requestData: EvaluationRequest) {
        return await request('/evaluations', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }
};
