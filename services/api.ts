
import { 
    INITIAL_USERS, 
    INITIAL_DEPARTMENTS, 
    INITIAL_RECORDS, 
    INITIAL_LOGS, 
    INITIAL_FORMULAS, 
    INITIAL_CRITERIA, 
    INITIAL_SALARY_VARIABLES, 
    INITIAL_RANKS, 
    INITIAL_GRADES, 
    INITIAL_HOLIDAY_POLICIES 
} from './mockData';

const STORAGE_KEYS = {
    USERS: 'HRM_USERS',
    DEPARTMENTS: 'HRM_DEPARTMENTS',
    RECORDS: 'HRM_RECORDS',
    LOGS: 'HRM_LOGS',
    FORMULAS: 'HRM_FORMULAS',
    CRITERIA: 'HRM_CRITERIA',
    VARIABLES: 'HRM_VARIABLES',
    RANKS: 'HRM_RANKS',
    GRIDS: 'HRM_GRIDS',
    HOLIDAYS: 'HRM_HOLIDAYS'
};

// Helper to simulate async delay for realistic feel (optional, kept short)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to read/write
const getStorage = (key: string, defaultVal: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
        console.error(`Error reading ${key} from LS`, e);
        return defaultVal;
    }
};

const setStorage = (key: string, val: any) => {
    localStorage.setItem(key, JSON.stringify(val));
};

export const api = {
    async fetchInitialData() {
        await delay(300); // Simulate network latency

        // Initialize data if not present
        const users = getStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
        const departments = getStorage(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
        const salaryRecords = getStorage(STORAGE_KEYS.RECORDS, INITIAL_RECORDS);
        const auditLogs = getStorage(STORAGE_KEYS.LOGS, INITIAL_LOGS);
        
        // Configs
        const formulas = getStorage(STORAGE_KEYS.FORMULAS, INITIAL_FORMULAS);
        const criteria = getStorage(STORAGE_KEYS.CRITERIA, INITIAL_CRITERIA);
        const variables = getStorage(STORAGE_KEYS.VARIABLES, INITIAL_SALARY_VARIABLES);
        const ranks = getStorage(STORAGE_KEYS.RANKS, INITIAL_RANKS);
        const grids = getStorage(STORAGE_KEYS.GRIDS, INITIAL_GRADES);
        const holidays = getStorage(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAY_POLICIES);

        // Ensure data persists initially if it was empty
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) setStorage(STORAGE_KEYS.USERS, users);
        if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) setStorage(STORAGE_KEYS.DEPARTMENTS, departments);
        if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) setStorage(STORAGE_KEYS.RECORDS, salaryRecords);
        if (!localStorage.getItem(STORAGE_KEYS.FORMULAS)) setStorage(STORAGE_KEYS.FORMULAS, formulas);

        return {
            users,
            departments,
            salaryRecords,
            auditLogs, // AppContext expects 'auditLogs' or map appropriately
            configs: {
                formulas,
                criteria,
                variables,
                ranks,
                grids,
                holidays
            }
        };
    },

    async saveUser(user: any) {
        await delay(100);
        const users = getStorage(STORAGE_KEYS.USERS, []);
        const idx = users.findIndex((u: any) => u.id === user.id);
        if (idx > -1) {
            users[idx] = user;
        } else {
            users.push(user);
        }
        setStorage(STORAGE_KEYS.USERS, users);
        return { success: true };
    },
    
    async deleteUser(id: string) {
        await delay(100);
        const users = getStorage(STORAGE_KEYS.USERS, []);
        const newUsers = users.filter((u: any) => u.id !== id);
        setStorage(STORAGE_KEYS.USERS, newUsers);
        return { success: true };
    },

    async saveDepartment(dept: any) {
        await delay(100);
        const depts = getStorage(STORAGE_KEYS.DEPARTMENTS, []);
        const idx = depts.findIndex((d: any) => d.id === dept.id);
        if (idx > -1) depts[idx] = dept;
        else depts.push(dept);
        setStorage(STORAGE_KEYS.DEPARTMENTS, depts);
        return { success: true };
    },

    async saveRecord(record: any) {
        await delay(200); // Simulate processing
        const records = getStorage(STORAGE_KEYS.RECORDS, []);
        const idx = records.findIndex((r: any) => r.id === record.id);
        if (idx > -1) records[idx] = record;
        else records.push(record);
        setStorage(STORAGE_KEYS.RECORDS, records);
        return { success: true };
    },
    
    async deleteRecord(id: string) {
        await delay(100);
        const records = getStorage(STORAGE_KEYS.RECORDS, []);
        const newRecords = records.filter((r: any) => r.id !== id);
        setStorage(STORAGE_KEYS.RECORDS, newRecords);
        return { success: true };
    },

    async saveConfig(key: string, data: any) {
        await delay(100);
        let storageKey = '';
        switch(key) {
            case 'formulas': storageKey = STORAGE_KEYS.FORMULAS; break;
            case 'criteria': storageKey = STORAGE_KEYS.CRITERIA; break;
            case 'variables': storageKey = STORAGE_KEYS.VARIABLES; break;
            case 'ranks': storageKey = STORAGE_KEYS.RANKS; break;
            case 'grids': storageKey = STORAGE_KEYS.GRIDS; break;
            case 'holidays': storageKey = STORAGE_KEYS.HOLIDAYS; break;
            default: return { success: false, message: 'Invalid config key' };
        }
        setStorage(storageKey, data);
        return { success: true };
    },
    
    async saveLog(log: any) {
        // Logs are append-only usually, but here we replace for simplicity or append
        const logs = getStorage(STORAGE_KEYS.LOGS, []);
        logs.unshift(log); // Add to beginning
        // Limit logs to last 500 to prevent LS overflow
        if (logs.length > 500) logs.pop();
        setStorage(STORAGE_KEYS.LOGS, logs);
        return { success: true };
    }
};
