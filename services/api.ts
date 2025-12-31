import { 
    User, Department, SalaryRecord, AttendanceRecord, SystemConfig, 
    SalaryFormula, SalaryVariable, Criterion, CriterionGroup, 
    PieceworkConfig, SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, 
    AuditLog, EvaluationRequest 
} from '../types'; // Import từ file types.ts cùng thư mục

// --- CẤU HÌNH ĐƯỜNG DẪN API ---
// Khi chạy trên Cloud Run (Production), import.meta.env.PROD là true
// URL sẽ là tương đối (/api) để Nginx/Container tự định tuyến
const IS_PROD = import.meta.env.PROD;
const API_BASE = IS_PROD ? '/api' : 'http://localhost:8080/api';

console.log(`[API SERVICE] Connecting to: ${API_BASE}`);

// Helper function để gửi request kèm Token
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

        // Xử lý lỗi 401 (Unauthorized) -> Logout
        if (response.status === 401) {
            console.warn("Session expired. Logging out...");
            localStorage.removeItem('HRM_TOKEN');
            localStorage.removeItem('HRM_USER');
            // Redirect về login nếu đang không ở trang login
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
            throw new Error("Unauthorized");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API FAIL] ${endpoint}:`, error);
        throw error;
    }
};

export const api = {
    // Helper để gọi raw request từ bên ngoài nếu cần
    request: request,

    // ==================================================
    // 1. AUTHENTICATION
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
                    localStorage.setItem('HRM_TOKEN', data.token);
                    localStorage.setItem('HRM_USER', JSON.stringify(data.user));
                    return data.user;
                }
            }
            return null;
        } catch (e) {
            console.error("Login failed:", e);
            return null;
        }
    },

    async logout() {
        localStorage.removeItem('HRM_TOKEN');
        localStorage.removeItem('HRM_USER');
    },

    // ==================================================
    // 2. USERS & DEPARTMENTS
    // ==================================================
    async getUsers() { return await request('/users'); },
    async saveUser(user: User) { 
        return await request('/users', { method: 'POST', body: JSON.stringify(user) }); 
    },
    async deleteUser(id: string) { return await request(`/users/${id}`, { method: 'DELETE' }); },

    async getDepartments() { return await request('/departments'); },
    async saveDepartment(dept: Department) { 
        return await request('/departments', { method: 'POST', body: JSON.stringify(dept) }); 
    },
    async deleteDepartment(id: string) { return await request(`/departments/${id}`, { method: 'DELETE' }); },

    // ==================================================
    // 3. ATTENDANCE & SALARY
    // ==================================================
    async getAttendance(month?: string) {
        const query = month ? `?month=${month}` : '';
        return await request(`/attendance${query}`);
    },
    async saveAttendance(data: AttendanceRecord | AttendanceRecord[]) {
        return await request('/attendance', { method: 'POST', body: JSON.stringify(data) });
    },

    async getSalaryRecords(month?: string) {
        const query = month ? `?month=${month}` : '';
        return await request(`/salary-records${query}`);
    },
    async saveSalaryRecord(record: SalaryRecord) {
        return await request('/salary-records', { method: 'POST', body: JSON.stringify(record) });
    },

    // ==================================================
    // 4. CONFIGURATION & MASTER DATA
    // ==================================================
    async getSystemConfig() { return await request('/config/system'); },
    
    // Hàm saveConfig đa năng
    async saveConfig(key: string, data: any) {
        try {
            let endpoint = '';
            switch(key) {
                case 'formulas': endpoint = '/formulas'; break;
                case 'criteria': endpoint = '/criteria/items'; break;
                case 'groups':   endpoint = '/criteria/groups'; break;
                case 'variables':endpoint = '/variables'; break;
                case 'ranks':    endpoint = '/ranks'; break;
                case 'piecework':endpoint = '/piecework-configs'; break;
                case 'holidays': endpoint = '/holidays'; break;
                case 'bonusTypes': endpoint = '/bonus-types'; break;
                case 'annualPolicies': endpoint = '/bonus-policies'; break;
                case 'dailyWork': endpoint = '/daily-work-items'; break;
                case 'system':    
                    return await request('/config/system', { method: 'POST', body: JSON.stringify(data) });
                default: 
                    console.warn(`Unknown config key: ${key}`);
                    return { success: false };
            }

            if (Array.isArray(data)) {
                await Promise.all(data.map(item => 
                    request(endpoint, { method: 'POST', body: JSON.stringify(item) })
                ));
            } else {
                await request(endpoint, { method: 'POST', body: JSON.stringify(data) });
            }
            return { success: true };
        } catch (e) {
            console.error(`Save config failed [${key}]:`, e);
            return { success: false };
        }
    },

    // ==================================================
    // 5. OTHERS (Logs, Evaluations)
    // ==================================================
    async getLogs() { return await request('/audit'); },
    async saveLog(log: AuditLog) { 
        return await request('/audit', { method: 'POST', body: JSON.stringify(log) }); 
    },

    async getEvaluations() { return await request('/evaluations'); },
    async saveEvaluation(data: EvaluationRequest) { 
        return await request('/evaluations', { method: 'POST', body: JSON.stringify(data) }); 
    },

    // ==================================================
    // 6. SALARY CALCULATION & ADJUSTMENTS
    // ==================================================
    async calculateMonthlySalary(month: string) {
        return await request(`/salary-records/calculate?month=${month}`, { method: 'POST' });
    },
    async updateSalaryStatus(id: string, status: RecordStatus, rejectionReason?: string) {
        return await request(`/salary-records/${id}/status`, { 
            method: 'PUT', 
            body: JSON.stringify({ status, rejectionReason }) 
        });
    },
    async addSalaryAdjustment(recordId: string, adjustment: any) {
        return await request(`/salary-records/${recordId}/adjustments`, { 
            method: 'POST', 
            body: JSON.stringify(adjustment) 
        });
    },
    async deleteSalaryAdjustment(recordId: string, adjId: string) {
        return await request(`/salary-records/${recordId}/adjustments/${adjId}`, { 
            method: 'DELETE' 
        });
    },
    async updateAdvancePayment(recordId: string, amount: number) {
        return await request(`/salary-records/${recordId}/advance-payment`, { 
            method: 'PUT', 
            body: JSON.stringify({ amount }) 
        });
    }
};
