# 📊 BÁO CÁO CHI TIẾT: YÊU CẦU BACKEND CHO HỆ THỐNG TÍNH LƯƠNG

## 🎯 MỤC TIÊU
Thiết kế backend đầy đủ để app chạy đúng 100% như thiết kế frontend, đặc biệt là tính toán bảng lương phân rã siêu chi tiết.

---

## 📋 PHẦN 1: DỮ LIỆU CẦN CÓ TRONG DATABASE

### 1.1. NHÂN SỰ (User)
```typescript
{
  id: string;
  username: string;
  password: string (hashed);
  name: string;
  avatar: string?;
  email: string?;
  phone: string?;
  
  // Thông tin cá nhân chi tiết
  gender: string?; // NAM, NU, OTHER
  birthday: DateTime?;
  address: string?;
  identityNumber: string?; // CCCD
  bankAccount: string?;
  bankName: string?;
  taxCode: string?;
  socialInsuranceNo: string?;
  
  // Tổ chức
  joinDate: DateTime;
  status: UserStatus; // ACTIVE, INACTIVE, MATERNITY, PROBATION, PENDING_APPROVAL
  roles: UserRole[]; // JSON array
  numberOfDependents: number; // Người phụ thuộc
  
  currentDeptId: string?;
  currentRankId: string?; // R1, R2...
  currentGradeId: string?; // G_R1_1...
  currentPosition: string?;
  
  // Cấu hình lương cá nhân
  paymentType: 'TIME' | 'PIECEWORK';
  efficiencySalary: Decimal; // Lương HQ định mức (LHQ_dm)
  pieceworkUnitPrice: Decimal; // Đơn giá khoán (DG_khoan)
  reservedBonusAmount: Decimal; // Quỹ thưởng treo cá nhân
  probationRate: number; // % lương thử việc (1-100)
}
```

### 1.2. PHÒNG BAN (Department)
```typescript
{
  id: string;
  name: string;
  budgetNorm: Decimal;
  managerId: string?; // Trưởng phòng
  blockDirectorId: string?; // Giám đốc khối
  hrId: string?; // Nhân sự phụ trách
}
```

### 1.3. CHẤM CÔNG (AttendanceRecord)
```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: AttendanceType; // TIME, PIECEWORK, DAILY, MODE, HOLIDAY, PAID_LEAVE, UNPAID, WAITING
  hours: number; // Giờ công chính (mặc định 8)
  overtimeHours: number; // Giờ tăng ca
  otRate: number; // Hệ số tăng ca (1.5, 2.0, 3.0)
  isOvertimeWithOutput: boolean; // Tăng ca có tính sản lượng?
  output: number?; // Sản lượng (nếu làm khoán)
  pieceworkUnitPrice: Decimal?; // Đơn giá khoán
  dailyWorkItemId: string?; // ID công việc nhật
  overtimeDailyWorkItemId: string?; // ID công việc nhật tăng ca
  status: RecordStatus; // DRAFT, PENDING_MANAGER, PENDING_HR, APPROVED, REJECTED
  notes: string?;
  sentToHrAt: DateTime?; // Thời điểm gửi hậu kiểm
  rejectionReason: string?;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 1.4. BẢNG LƯƠNG (SalaryRecord)
```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM
  
  // === SNAPSHOT CÁC CHỈ SỐ LÚC TÍNH LƯƠNG ===
  
  // NHÓM CÔNG
  Ctc: number; // Công tiêu chuẩn (tổng ngày trong tháng trừ Chủ nhật)
  Ctt: number; // Công thực tế (tổng công thời gian hoặc công khoán)
  Cn: number; // Công nhật (số ngày làm việc theo đơn giá nhật việc)
  NCD: number; // Nghỉ chế độ (nghỉ hưởng BHXH)
  NL: number; // Nghỉ lễ
  NCL: number; // Nghỉ có lương (nghỉ phép năm)
  NKL: number; // Nghỉ không lương
  NCV: number; // Nghỉ chờ việc (nghỉ do lỗi doanh nghiệp)
  
  // NHÓM ĐỊNH MỨC
  LCB_dm: Decimal; // Lương CB định mức (từ SalaryGrade.baseSalary)
  LHQ_dm: Decimal; // Lương HQ định mức (từ User.efficiencySalary)
  LSL_dm: Decimal; // Lương khoán định mức (SL_khoan * DG_khoan)
  SL_khoan: number; // Sản lượng khoán (từ PieceworkConfig.targetOutput)
  SL_tt: number; // Sản lượng thực tế (tổng output từ AttendanceRecord)
  DG_khoan: Decimal; // Đơn giá khoán (từ User.pieceworkUnitPrice hoặc PieceworkConfig.unitPrice)
  HS_tn: number; // Hệ số thâm niên (tính từ SeniorityRule dựa trên số tháng làm việc)
  probationRate: number; // Tỷ lệ thử việc snapshot (từ User.probationRate)
  
  // === KẾT QUẢ TÍNH TOÁN ===
  
  // THU NHẬP
  actualBaseSalary: Decimal; // LCB_tt = (LCB_dm / Ctc) * Ctt
  actualEfficiencySalary: Decimal; // LHQ_tt (cho nhân viên TIME)
  actualPieceworkSalary: Decimal; // LSL_tt (cho nhân viên PIECEWORK)
  otherSalary: Decimal; // Lương khác = Lcn + Ltc + Lncl
  overtimeSalary: Decimal; // Lương tăng ca riêng
  totalAllowance: Decimal; // Tổng phụ cấp = PC_cd + PC_lh
  totalBonus: Decimal; // Tổng thưởng = TH_cd + TH_lh
  
  // KHẤU TRỪ
  insuranceDeduction: Decimal; // BHXH (10.5% của insuranceBase, tối đa maxInsuranceBase)
  unionFee: Decimal; // Công đoàn (1% của insuranceBase)
  pitDeduction: Decimal; // Thuế TNCN (tính theo biểu thuế lũy tiến)
  advancePayment: Decimal; // Tạm ứng
  otherDeductions: Decimal; // Khấu trừ khác (từ adjustments)
  
  // KẾT QUẢ CUỐI
  calculatedSalary: Decimal; // Tổng Gross = actualBaseSalary + actualEfficiencySalary + actualPieceworkSalary + otherSalary + totalAllowance + totalBonus
  netSalary: Decimal; // Thực lĩnh = (calculatedSalary - insuranceDeduction - unionFee - pitDeduction - advancePayment - otherDeductions) * (probationRate / 100)
  
  // METADATA
  status: RecordStatus;
  calculationLog: JSON?; // Chi tiết các bước tính toán
  adjustments: JSON?; // Mảng các điều chỉnh tay
  sentToHrAt: DateTime?;
  rejectionReason: string?;
  lastUpdated: DateTime;
}
```

### 1.5. ĐÁNH GIÁ KPI (EvaluationRequest)
```typescript
{
  id: string;
  userId: string;
  criteriaId: string;
  criteriaName: string;
  type: 'BONUS' | 'PENALTY';
  scope: 'MAIN_JOB' | 'SIDE_JOB'?;
  target: 'MONTHLY_SALARY' | 'RESERVED_BONUS';
  points: number; // % HQ hoặc số tiền (nếu target = RESERVED_BONUS)
  description: string?;
  proofFileName: string?;
  requesterId: string;
  status: RecordStatus;
  createdAt: DateTime;
  rejectionReason: string?;
}
```

### 1.6. TIÊU CHÍ ĐÁNH GIÁ (Criterion)
```typescript
{
  id: string;
  groupId: string;
  name: string;
  type: 'BONUS' | 'PENALTY';
  unit: 'PERCENT' | 'AMOUNT';
  value: number; // % HQ hoặc số tiền
  point: number?;
  threshold: number; // Ngưỡng vi phạm (bỏ qua N lần đầu)
  description: string;
}
```

### 1.7. NHÓM TIÊU CHÍ (CriterionGroup)
```typescript
{
  id: string;
  name: string;
  weight: number; // Tỷ trọng (%)
}
```

### 1.8. KHUNG NĂNG LỰC (SalaryRank & SalaryGrade)
```typescript
// SalaryRank
{
  id: string;
  name: string;
  description: string?;
  order: number;
  baseSalary: Decimal;
  allowance: Decimal;
}

// SalaryGrade
{
  id: string;
  rankId: string;
  name: string;
  level: number;
  multiplier: number;
  amount: Decimal;
  baseSalary: Decimal; // Lương cơ bản
  efficiencySalary: Decimal; // Lương hiệu quả
  fixedAllowance: Decimal; // Phụ cấp cố định
  flexibleAllowance: Decimal; // Phụ cấp linh hoạt
  otherSalary: Decimal; // Lương khác
  fixedBonuses: JSON?; // [{month: 1, name: "Tết", amount: 1000000}, ...]
}
```

### 1.9. CẤU HÌNH HỆ THỐNG (SystemConfig)
```typescript
{
  id: string; // "default_config"
  baseSalary: Decimal; // Lương cơ sở
  standardWorkDays: number; // Số ngày công chuẩn/tháng (mặc định 26)
  insuranceBaseSalary: Decimal; // Lương đóng bảo hiểm
  maxInsuranceBase: Decimal; // Trần lương đóng BH
  
  // Thuế & Khấu trừ
  pitSteps: JSON; // Biểu thuế lũy tiến [{id, label, threshold, rate, subtraction}]
  seniorityRules: JSON; // Quy tắc thâm niên [{id, label, minMonths, maxMonths, coefficient}]
  
  // Cấu hình mở rộng (lưu trong insuranceRules JSON)
  isPeriodLocked: boolean; // Khóa kỳ quyết toán
  autoApproveDays: number; // Tự động duyệt sau N ngày
  hrAutoApproveHours: number; // Tự động duyệt sau N giờ hậu kiểm
  approvalMode: 'POST_AUDIT' | 'FULL_APPROVAL';
  personalRelief: number; // Giảm trừ bản thân (11.000.000)
  dependentRelief: number; // Giảm trừ phụ thuộc (4.400.000)
  insuranceRate: number; // Tỷ lệ BHXH (10.5%)
  unionFeeRate: number; // Tỷ lệ công đoàn (1%)
  approvalWorkflow: JSON; // Luồng phê duyệt [{id, role, label, statusOnEnter, approvalType, condition}]
  
  lastModifiedBy: string?;
  lastModifiedAt: string?;
  hasPendingChanges: boolean;
  pendingChangeSummary: string?;
  updatedAt: DateTime;
}
```

### 1.10. CÔNG VIỆC NHẬT (DailyWorkItem)
```typescript
{
  id: string;
  name: string;
  unitPrice: Decimal; // Đơn giá/ngày
  type: string; // "SERVICE"
}
```

### 1.11. CẤU HÌNH KHOÁN (PieceworkConfig)
```typescript
{
  id: string;
  userId: string;
  month: string; // YYYY-MM
  targetOutput: number; // Sản lượng mục tiêu
  unitPrice: Decimal; // Đơn giá khoán
}
```

### 1.12. CÔNG THỨC LƯƠNG (SalaryFormula)
```typescript
{
  id: string;
  code: string; // Unique
  name: string;
  area: string; // OFFICE, FACTORY, ALL
  expression: string; // Công thức dạng: ({LCB_dm} / {Ctc}) * {Ctt}
  description: string?;
  status: string; // ACTIVE, INACTIVE
  group: string?;
  order: number; // Thứ tự tính toán
}
```

### 1.13. BIẾN SỐ (SalaryVariable)
```typescript
{
  id: string;
  code: string; // Unique, dùng trong công thức
  name: string;
  group: string; // CÔNG, ĐỊNH MỨC, THU NHẬP THỰC, PHỤ CẤP/THƯỞNG, KHẤU TRỪ/THUẾ, KẾT QUẢ
  description: string?;
}
```

---

## 📐 PHẦN 2: CÔNG THỨC TÍNH TOÁN CHI TIẾT

### 2.1. TÍNH CÔNG (Công thức từ AttendanceRecord)

#### 2.1.1. Công Tiêu Chuẩn (Ctc)
```
Ctc = Tổng số ngày trong tháng - Số Chủ nhật
Ví dụ: Tháng 12/2024 có 31 ngày, 5 Chủ nhật → Ctc = 26
```

#### 2.1.2. Công Thực Tế (Ctt)
```
Nếu paymentType = 'TIME':
  Ctt = Tổng số ngày có type = TIME, PIECEWORK, DAILY (đã APPROVED)
  
Nếu paymentType = 'PIECEWORK':
  Ctt = Tổng số ngày có type = PIECEWORK (đã APPROVED)
```

#### 2.1.3. Công Nhật (Cn)
```
Cn = Số ngày có type = DAILY (đã APPROVED)
```

#### 2.1.4. Các Loại Nghỉ
```
NCD = Số ngày có type = MODE (nghỉ chế độ)
NL = Số ngày có type = HOLIDAY (nghỉ lễ)
NCL = Số ngày có type = PAID_LEAVE (nghỉ phép có lương)
NKL = Số ngày có type = UNPAID (nghỉ không lương)
NCV = Số ngày có type = WAITING (nghỉ chờ việc)
```

### 2.2. TÍNH LƯƠNG CƠ BẢN THỰC TẾ (LCB_tt)

**Công thức:**
```
LCB_tt = (LCB_dm / Ctc) * Ctt
```

**Trong đó:**
- `LCB_dm` = Lấy từ `SalaryGrade.baseSalary` của `currentGradeId`
- `Ctc` = Công tiêu chuẩn (tính từ số ngày trong tháng)
- `Ctt` = Công thực tế (tổng công đã phê duyệt)

**Ví dụ:**
```
LCB_dm = 10,000,000
Ctc = 26
Ctt = 24
→ LCB_tt = (10,000,000 / 26) * 24 = 9,230,769
```

### 2.3. TÍNH LƯƠNG HIỆU QUẢ THỰC TẾ (LHQ_tt) - Cho nhân viên TIME

**Công thức:**
```
LHQ_tt = (LHQ_dm / Ctc) * Ctt + (∑(CO_tc * TT_ntc) - ∑(TR_tc * TT_ntc)) * LHQ_dm
```

**Trong đó:**
- `LHQ_dm` = Lấy từ `User.efficiencySalary`
- `CO_tc` = Tổng điểm cộng KPI (từ EvaluationRequest type=BONUS, status=APPROVED)
- `TR_tc` = Tổng điểm trừ KPI (từ EvaluationRequest type=PENALTY, status=APPROVED)
- `TT_ntc` = Tỷ trọng nhóm tiêu chí (từ CriterionGroup.weight / 100)

**Logic tính điểm KPI:**
```
Với mỗi EvaluationRequest đã APPROVED trong tháng:
  - Nếu target = RESERVED_BONUS: 
      → Trừ trực tiếp vào reservedBonusAmount (không tính vào LHQ_tt)
  
  - Nếu target = MONTHLY_SALARY:
      → Lấy criteria.value (% HQ)
      → Lấy group.weight (%)
      → Điểm KPI = (criteria.value / 100) * (group.weight / 100)
      → Nếu type = PENALTY và có threshold:
          → Đếm số lần vi phạm cùng criteriaId trong tháng (theo thứ tự createdAt)
          → Nếu số lần <= threshold: BỎ QUA (không trừ)
          → Nếu số lần > threshold: TÍNH TRỪ
      
      → Tiền KPI = Điểm KPI * LHQ_dm
      → Nếu type = BONUS: CO_tc += Điểm KPI
      → Nếu type = PENALTY: TR_tc += Điểm KPI
```

**Ví dụ:**
```
LHQ_dm = 8,000,000
Ctc = 26
Ctt = 24
CO_tc = 0.05 (5% từ 1 tiêu chí thưởng, nhóm có weight 50%)
TR_tc = 0.01 (1% từ 1 tiêu chí phạt, nhóm có weight 20%)

→ LHQ_tt = (8,000,000 / 26) * 24 + (0.05 - 0.01) * 8,000,000
         = 7,384,615 + 320,000
         = 7,704,615
```

### 2.4. TÍNH LƯƠNG KHOÁN THỰC TẾ (LSL_tt) - Cho nhân viên PIECEWORK

**Công thức:**
```
LSL_tt = (LSL_dm / Ctc) * Ctt + (∑(CO_tc * TT_ntc) - ∑(TR_tc * TT_ntc)) * LSL_dm
```

**Trong đó:**
- `LSL_dm` = SL_khoan * DG_khoan
  - `SL_khoan` = Lấy từ `PieceworkConfig.targetOutput` (theo userId và month)
  - `DG_khoan` = Lấy từ `User.pieceworkUnitPrice` hoặc `PieceworkConfig.unitPrice`
- Logic tính KPI giống như LHQ_tt

**Ví dụ:**
```
SL_khoan = 1000 (sản phẩm)
DG_khoan = 50,000
→ LSL_dm = 1000 * 50,000 = 50,000,000

Ctc = 26
Ctt = 24
CO_tc = 0.05
TR_tc = 0.01

→ LSL_tt = (50,000,000 / 26) * 24 + (0.05 - 0.01) * 50,000,000
         = 46,153,846 + 2,000,000
         = 48,153,846
```

### 2.5. TÍNH LƯƠNG KHÁC (Lk = Lcn + Ltc + Lncl)

#### 2.5.1. Lương Công Nhật (Lcn)
```
Lcn = Tổng (DailyWorkItem.unitPrice) cho các ngày có type = DAILY
```

**Ví dụ:**
```
Ngày 1: DAILY với dailyWorkItemId = "DW1" (unitPrice = 350,000)
Ngày 5: DAILY với dailyWorkItemId = "DW2" (unitPrice = 200,000)
→ Lcn = 350,000 + 200,000 = 550,000
```

#### 2.5.2. Lương Tăng Ca (Ltc)

**Có 2 loại tăng ca:**

**a) Tăng ca KHÔNG tính sản lượng (isOvertimeWithOutput = false):**
```
Nếu có overtimeDailyWorkItemId:
  Ltc_ksl = overtimeHours * (DailyWorkItem.unitPrice / 8) * otRate
Nếu không có overtimeDailyWorkItemId:
  Ltc_ksl = overtimeHours * (LCB_dm / Ctc / 8) * otRate
```

**b) Tăng ca CÓ tính sản lượng (isOvertimeWithOutput = true):**
```
Ltc_csl = overtimeHours * (LCB_dm / Ctc / 8) * otRate
```

**Tổng lương tăng ca:**
```
Ltc = Ltc_ksl + Ltc_csl
```

**Ví dụ:**
```
overtimeHours = 4
otRate = 1.5
LCB_dm = 10,000,000
Ctc = 26
isOvertimeWithOutput = false
không có overtimeDailyWorkItemId

→ Ltc = 4 * (10,000,000 / 26 / 8) * 1.5
      = 4 * 48,076.92 * 1.5
      = 288,461.5
```

#### 2.5.3. Lương Nghỉ Có Lương (Lncl)
```
Lncl = (NCD + NL + NCL) * (LCB_dm / Ctc) + (NCV * LCB_dm / Ctc * 0.7)
```

**Trong đó:**
- NCD, NL, NCL: Hưởng 100% lương
- NCV: Hưởng 70% lương

**Ví dụ:**
```
NCD = 2
NL = 1
NCL = 1
NCV = 0
LCB_dm = 10,000,000
Ctc = 26

→ Lncl = (2 + 1 + 1) * (10,000,000 / 26) + 0
       = 4 * 384,615.38
       = 1,538,461.5
```

#### 2.5.4. Tổng Lương Khác
```
Lk = Lcn + Ltc + Lncl
otherSalary = Lk + Điều chỉnh tay (từ adjustments type=OTHER_SALARY)
```

### 2.6. TÍNH PHỤ CẤP (PC = PC_cd + PC_lh)

#### 2.6.1. Phụ Cấp Cố Định (PC_cd)
```
PC_cd = SalaryGrade.fixedAllowance (từ currentGradeId)
```

#### 2.6.2. Phụ Cấp Linh Hoạt (PC_lh)
```
PC_lh = Tổng (adjustments type=ALLOWANCE)
```

#### 2.6.3. Tổng Phụ Cấp
```
totalAllowance = PC_cd + PC_lh
```

### 2.7. TÍNH THƯỞNG (TH = TH_cd + TH_lh)

#### 2.7.1. Thưởng Cố Định (TH_cd)
```
TH_cd = Tổng (SalaryGrade.fixedBonuses) cho tháng hiện tại
```

**Ví dụ:**
```
fixedBonuses = [
  {month: 1, name: "Tết", amount: 5,000,000},
  {month: 9, name: "Trung thu", amount: 2,000,000}
]
Tháng 1 → TH_cd = 5,000,000
Tháng 9 → TH_cd = 2,000,000
```

#### 2.7.2. Thưởng Linh Hoạt (TH_lh)
```
TH_lh = Tổng (adjustments type=BONUS)
```

#### 2.7.3. Tổng Thưởng
```
totalBonus = TH_cd + TH_lh
```

### 2.8. TÍNH HỆ SỐ THÂM NIÊN (HS_tn)

**Công thức:**
```
HS_tn = Lấy từ SeniorityRule.coefficient dựa trên số tháng làm việc

Số tháng làm việc = (Ngày hiện tại - User.joinDate) / 30

Tìm SeniorityRule thỏa:
  minMonths <= Số tháng làm việc <= maxMonths

→ HS_tn = coefficient
```

**Ví dụ:**
```
joinDate = 2020-01-01
Ngày hiện tại = 2024-12-31
→ Số tháng = (2024-12-31 - 2020-01-01) / 30 = 59.67 tháng

SeniorityRule:
  {minMonths: 48, maxMonths: 60, coefficient: 1.2}
  
→ HS_tn = 1.2
```

**Lưu ý:** HS_tn có thể được áp dụng vào thưởng hoặc phụ cấp tùy quy định.

### 2.9. TÍNH KHẤU TRỪ BẢO HIỂM (BHXH)

**Công thức:**
```
insuranceDeduction = MIN(insuranceBase, maxInsuranceBase) * (insuranceRate / 100)
```

**Trong đó:**
- `insuranceBase` = MIN(calculatedSalary, maxInsuranceBase)
- `insuranceRate` = Từ SystemConfig.insuranceRate (mặc định 10.5%)

**Ví dụ:**
```
calculatedSalary = 15,000,000
maxInsuranceBase = 36,000,000
insuranceRate = 10.5%

→ insuranceBase = MIN(15,000,000, 36,000,000) = 15,000,000
→ insuranceDeduction = 15,000,000 * 0.105 = 1,575,000
```

### 2.10. TÍNH PHÍ CÔNG ĐOÀN (CD)

**Công thức:**
```
unionFee = MIN(insuranceBase, maxInsuranceBase) * (unionFeeRate / 100)
```

**Trong đó:**
- `unionFeeRate` = Từ SystemConfig.unionFeeRate (mặc định 1%)

**Ví dụ:**
```
insuranceBase = 15,000,000
unionFeeRate = 1%

→ unionFee = 15,000,000 * 0.01 = 150,000
```

### 2.11. TÍNH THUẾ THU NHẬP CÁ NHÂN (TNCN)

**Công thức:**
```
1. Thu nhập chịu thuế (TN_ct):
   TN_ct = calculatedSalary - insuranceDeduction - unionFee - personalRelief - (dependentRelief * numberOfDependents)

2. Áp dụng biểu thuế lũy tiến (từ SystemConfig.pitSteps):
   pitDeduction = f(TN_ct)
   
   Logic:
   - Sắp xếp pitSteps theo threshold tăng dần
   - Tìm bậc thuế phù hợp: TN_ct <= threshold
   - pitDeduction = (TN_ct * rate / 100) - subtraction
```

**Ví dụ:**
```
calculatedSalary = 20,000,000
insuranceDeduction = 1,575,000
unionFee = 150,000
personalRelief = 11,000,000
dependentRelief = 4,400,000
numberOfDependents = 1

→ TN_ct = 20,000,000 - 1,575,000 - 150,000 - 11,000,000 - 4,400,000
        = 2,875,000

pitSteps = [
  {threshold: 5000000, rate: 5, subtraction: 0},
  {threshold: 10000000, rate: 10, subtraction: 250000},
  {threshold: 18000000, rate: 15, subtraction: 750000},
  {threshold: 32000000, rate: 20, subtraction: 1650000}
]

→ TN_ct = 2,875,000 <= 5,000,000
→ pitDeduction = (2,875,000 * 5 / 100) - 0 = 143,750
```

### 2.12. TÍNH TỔNG GROSS (calculatedSalary)

**Công thức:**
```
calculatedSalary = actualBaseSalary 
                 + actualEfficiencySalary 
                 + actualPieceworkSalary 
                 + otherSalary 
                 + totalAllowance 
                 + totalBonus
```

### 2.13. TÍNH THỰC LĨNH (netSalary)

**Công thức:**
```
netSalary = (calculatedSalary 
           - insuranceDeduction 
           - unionFee 
           - pitDeduction 
           - advancePayment 
           - otherDeductions) 
           * (probationRate / 100)
```

**Ví dụ:**
```
calculatedSalary = 20,000,000
insuranceDeduction = 1,575,000
unionFee = 150,000
pitDeduction = 143,750
advancePayment = 2,000,000
otherDeductions = 0
probationRate = 100

→ netSalary = (20,000,000 - 1,575,000 - 150,000 - 143,750 - 2,000,000 - 0) * (100 / 100)
            = 16,131,250
```

---

## 🔄 PHẦN 3: LOGIC PHÊ DUYỆT

### 3.1. TRẠNG THÁI PHÊ DUYỆT (RecordStatus)

```
DRAFT → PENDING_MANAGER → PENDING_HR → APPROVED
   ↓
REJECTED (có thể từ bất kỳ bước nào)
```

**Các trạng thái:**
- `DRAFT`: Bản nháp, chưa gửi
- `PENDING`: Đang chờ (generic)
- `PENDING_MANAGER`: Chờ Quản lý duyệt
- `PENDING_GDK`: Chờ Giám đốc khối duyệt
- `PENDING_BLD`: Chờ Ban lãnh đạo duyệt
- `PENDING_HR`: Chờ Hậu kiểm (Nhân sự)
- `APPROVED`: Đã phê duyệt
- `REJECTED`: Từ chối

### 3.2. LUỒNG PHÊ DUYỆT ĐỘNG (ApprovalWorkflow)

**Cấu trúc:**
```typescript
{
  id: string;
  role: UserRole; // QUAN_LY, GIAM_DOC_KHOI, BAN_LANH_DAO, NHAN_SU
  label: string;
  statusOnEnter: RecordStatus; // Trạng thái khi vào bước này
  approvalType: 'DECISIVE' | 'INFORMATIVE'; // Quyết định chốt hay chỉ thông báo
  condition: 'ALL' | 'PRODUCTION_ONLY' | 'OFFICE_ONLY'; // Phạm vi áp dụng
}
```

**Logic xác định bước tiếp theo:**
```
1. Bỏ qua các bước có role trùng với roles của người hưởng lợi
2. Bỏ qua các bước có condition không phù hợp (PRODUCTION_ONLY cho nhân viên văn phòng)
3. Lấy bước đầu tiên còn lại → statusOnEnter
```

**Ví dụ:**
```
Workflow:
  1. {role: QUAN_LY, statusOnEnter: PENDING_MANAGER}
  2. {role: GIAM_DOC_KHOI, statusOnEnter: PENDING_GDK}
  3. {role: BAN_LANH_DAO, statusOnEnter: PENDING_BLD}
  4. {role: NHAN_SU, statusOnEnter: PENDING_HR}

Người hưởng lợi có roles = [QUAN_LY]
→ Bỏ qua bước 1
→ Bước tiếp theo: PENDING_GDK
```

### 3.3. QUYỀN PHÊ DUYỆT

**Logic kiểm tra:**
```
canApproveStatus(currentUser, status, dept, workflow):
  1. ADMIN luôn có quyền
  2. Tìm bước trong workflow có statusOnEnter = status
  3. Kiểm tra currentUser.roles có chứa step.role không
  4. Kiểm tra thẩm quyền theo đơn vị:
     - QUAN_LY: dept.managerId === currentUser.id
     - GIAM_DOC_KHOI: dept.blockDirectorId === currentUser.id
     - BAN_LANH_DAO: Luôn có quyền
     - NHAN_SU: dept.hrId === currentUser.id hoặc có role NHAN_SU
```

### 3.4. TỰ ĐỘNG DUYỆT HẬU KIỂM

**Logic:**
```
Nếu approvalMode = 'POST_AUDIT':
  - Khi status = PENDING_HR và có sentToHrAt
  - Nếu (thời gian hiện tại - sentToHrAt) >= hrAutoApproveHours
  → Tự động chuyển sang APPROVED
```

---

## 📊 PHẦN 4: CÁC BIẾN SỐ HỆ THỐNG

### 4.1. NHÓM CÔNG
- `Ctc`: Công tiêu chuẩn
- `Ctt`: Công thực tế
- `Cn`: Công nhật
- `OT_h_csl`: Giờ OT có sản lượng
- `OT_h_ksl`: Giờ OT không sản lượng
- `NCD`: Nghỉ chế độ
- `NL`: Nghỉ lễ
- `NCL`: Nghỉ có lương
- `NKL`: Nghỉ không lương
- `NCV`: Nghỉ chờ việc
- `OT_hs`: Hệ số tăng ca

### 4.2. NHÓM ĐỊNH MỨC
- `LCB_dm`: Lương CB định mức
- `LHQ_dm`: Lương HQ định mức
- `LSL_dm`: Lương khoán định mức
- `SL_khoan`: Sản lượng khoán
- `DG_khoan`: Đơn giá khoán
- `TT_ntc`: Tỷ trọng nhóm tiêu chí
- `HS_tn`: Hệ số thâm niên

### 4.3. NHÓM THU NHẬP THỰC
- `LCB_tt`: Lương CB thực tế
- `LHQ_tt`: Lương HQ thực tế
- `LSL_tt`: Lương khoán thực tế
- `SL_tt`: Sản lượng thực tế
- `Lk`: Lương khác
- `Lcn`: Lương công nhật
- `DG_cn`: Đơn giá công nhật
- `Ltc_ksl`: Lương OT không SL
- `Ltc_csl`: Lương OT có SL
- `Lncl`: Lương nghỉ có lương

### 4.4. PHỤ CẤP / THƯỞNG
- `PC`: Tổng phụ cấp
- `PC_cd`: Phụ cấp cố định
- `PC_lh`: Phụ cấp linh hoạt
- `TH`: Tổng thưởng
- `TH_cd`: Thưởng cố định
- `TH_lh`: Thưởng linh hoạt
- `CO_tc`: Điểm cộng tiêu chí
- `TR_tc`: Điểm trừ tiêu chí

### 4.5. KHẤU TRỪ / THUẾ
- `KT`: Tổng khấu trừ
- `BHXH`: Bảo hiểm xã hội
- `CD`: Công đoàn
- `TNCN`: Thuế TNCN
- `GT_bt`: Giảm trừ bản thân
- `N_pt`: Người phụ thuộc
- `GT_pt`: Giảm trừ phụ thuộc
- `KT_kh`: Khấu trừ khác

### 4.6. KẾT QUẢ
- `Gross`: Tổng thu nhập Gross
- `TU`: Tạm ứng
- `Net`: Thực lĩnh Net

---

## 🔧 PHẦN 5: API ENDPOINTS CẦN THIẾT

### 5.1. AUTHENTICATION
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất (optional, frontend tự xử lý)

### 5.2. USERS
- `GET /api/users` - Lấy danh sách users (map userName, positionName, department)
- `POST /api/users` - Tạo/sửa user
- `DELETE /api/users/:id` - Xóa user

### 5.3. DEPARTMENTS
- `GET /api/departments` - Lấy danh sách phòng ban
- `POST /api/departments` - Tạo/sửa phòng ban
- `DELETE /api/departments/:id` - Xóa phòng ban

### 5.4. ATTENDANCE
- `GET /api/attendance?month=YYYY-MM` - Lấy chấm công (map dailyWorkItemId, overtimeDailyWorkItemId)
- `POST /api/attendance` - Lưu chấm công (có thể array)

### 5.5. SALARY RECORDS (QUAN TRỌNG NHẤT)
- `GET /api/salary-records?month=YYYY-MM` - Lấy bảng lương
  - **PHẢI TÍNH TOÁN ĐẦY ĐỦ** tất cả các trường
  - Map userName, positionName, department từ User
  - Đảm bảo tất cả trường có giá trị mặc định
  
- `POST /api/salary-records` - Lưu bảng lương
  - Nhận đầy đủ các trường từ frontend
  - Lưu vào database

- `POST /api/salary-records/calculate?month=YYYY-MM` - **ENDPOINT TÍNH LƯƠNG TỰ ĐỘNG**
  - Tính toán tất cả các công thức
  - Tạo/cập nhật SalaryRecord cho tất cả users
  - Trả về danh sách SalaryRecord đã tính

### 5.6. EVALUATIONS
- `GET /api/evaluations` - Lấy danh sách đánh giá (map userName, scope)
- `POST /api/evaluations` - Tạo/sửa đánh giá
- `PATCH /api/evaluations/:id/approve` - Phê duyệt
- `PATCH /api/evaluations/:id/reject` - Từ chối

### 5.7. SYSTEM CONFIG
- `GET /api/config/system` - Lấy cấu hình hệ thống
- `POST /api/config/system` - Lưu cấu hình hệ thống

### 5.8. MASTER DATA
- `GET /api/ranks` - Lấy danh sách cấp bậc
- `GET /api/salary-grades` - Lấy danh sách bậc lương
- `GET /api/criteria/items` - Lấy danh sách tiêu chí
- `GET /api/criteria/groups` - Lấy danh sách nhóm tiêu chí
- `GET /api/daily-work-items` - Lấy danh sách công việc nhật
- `GET /api/piecework-configs` - Lấy cấu hình khoán
- `GET /api/formulas` - Lấy công thức
- `GET /api/variables` - Lấy biến số
- `GET /api/holidays` - Lấy ngày lễ
- `GET /api/bonus-types` - Lấy loại thưởng
- `GET /api/bonus-policies` - Lấy chính sách thưởng

### 5.9. AUDIT LOGS
- `GET /api/audit` - Lấy nhật ký (map isConfigAction)
- `POST /api/audit` - Tạo log mới

---

## 🧮 PHẦN 6: LOGIC TÍNH TOÁN CHI TIẾT CHO BACKEND

### 6.1. HÀM TÍNH CÔNG TIÊU CHUẨN (Ctc)

```typescript
function calculateCtc(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) sundays++;
  }
  return daysInMonth - sundays;
}
```

### 6.2. HÀM TÍNH CÔNG THỰC TẾ (Ctt)

```typescript
function calculateCtt(
  userId: string,
  month: string,
  attendanceRecords: AttendanceRecord[],
  user: User
): number {
  const monthRecords = attendanceRecords.filter(
    r => r.userId === userId && 
    r.date.startsWith(month) && 
    r.status === RecordStatus.APPROVED
  );
  
  if (user.paymentType === 'PIECEWORK') {
    return monthRecords.filter(r => r.type === AttendanceType.PIECEWORK).length;
  } else {
    return monthRecords.filter(r => 
      [AttendanceType.TIME, AttendanceType.PIECEWORK, AttendanceType.DAILY].includes(r.type)
    ).length;
  }
}
```

### 6.3. HÀM TÍNH LƯƠNG CƠ BẢN THỰC TẾ

```typescript
function calculateLCB_tt(
  LCB_dm: number,
  Ctc: number,
  Ctt: number
): number {
  if (Ctc === 0) return 0;
  return (LCB_dm / Ctc) * Ctt;
}
```

### 6.4. HÀM TÍNH ĐIỂM KPI VÀ TIỀN KPI

```typescript
function calculateKPIPoints(
  userId: string,
  month: string,
  evaluationRequests: EvaluationRequest[],
  criteriaList: Criterion[],
  criteriaGroups: CriterionGroup[],
  user: User
): { CO_tc: number, TR_tc: number } {
  const monthEvals = evaluationRequests.filter(
    e => e.userId === userId && 
    e.createdAt.startsWith(month) && 
    e.status === RecordStatus.APPROVED &&
    e.target === EvaluationTarget.MONTHLY_SALARY
  );
  
  let CO_tc = 0;
  let TR_tc = 0;
  
  // Đếm số lần vi phạm theo criteriaId để xử lý threshold
  const criteriaCounts: Record<string, number> = {};
  const sortedEvals = [...monthEvals].sort((a, b) => 
    a.createdAt.localeCompare(b.createdAt)
  );
  
  for (const eval of sortedEvals) {
    const criteria = criteriaList.find(c => c.id === eval.criteriaId);
    const group = criteriaGroups.find(g => g.id === criteria?.groupId);
    
    if (!criteria || !group) continue;
    
    criteriaCounts[eval.criteriaId] = (criteriaCounts[eval.criteriaId] || 0) + 1;
    
    // Bỏ qua nếu chưa vượt threshold (chỉ áp dụng cho PENALTY)
    if (eval.type === 'PENALTY' && criteria.threshold > 0) {
      if (criteriaCounts[eval.criteriaId] <= criteria.threshold) {
        continue; // Bỏ qua lần này
      }
    }
    
    // Tính điểm KPI
    const kpiPoint = (criteria.value / 100) * (group.weight / 100);
    
    if (eval.type === 'BONUS') {
      CO_tc += kpiPoint;
    } else {
      TR_tc += kpiPoint;
    }
  }
  
  return { CO_tc, TR_tc };
}
```

### 6.5. HÀM TÍNH LƯƠNG HIỆU QUẢ THỰC TẾ

```typescript
function calculateLHQ_tt(
  LHQ_dm: number,
  Ctc: number,
  Ctt: number,
  CO_tc: number,
  TR_tc: number
): number {
  const base = (LHQ_dm / Ctc) * Ctt;
  const kpiAdjustment = (CO_tc - TR_tc) * LHQ_dm;
  return base + kpiAdjustment;
}
```

### 6.6. HÀM TÍNH LƯƠNG KHOÁN THỰC TẾ

```typescript
function calculateLSL_tt(
  SL_khoan: number,
  DG_khoan: number,
  SL_tt: number,
  Ctc: number,
  Ctt: number,
  CO_tc: number,
  TR_tc: number
): number {
  const LSL_dm = SL_khoan * DG_khoan;
  const base = (LSL_dm / Ctc) * Ctt;
  const kpiAdjustment = (CO_tc - TR_tc) * LSL_dm;
  return base + kpiAdjustment;
}
```

### 6.7. HÀM TÍNH LƯƠNG CÔNG NHẬT

```typescript
function calculateLcn(
  userId: string,
  month: string,
  attendanceRecords: AttendanceRecord[],
  dailyWorkCatalog: DailyWorkItem[]
): number {
  const monthRecords = attendanceRecords.filter(
    r => r.userId === userId && 
    r.date.startsWith(month) && 
    r.type === AttendanceType.DAILY &&
    r.status === RecordStatus.APPROVED
  );
  
  return monthRecords.reduce((sum, r) => {
    if (r.dailyWorkItemId) {
      const item = dailyWorkCatalog.find(i => i.id === r.dailyWorkItemId);
      return sum + (item?.unitPrice || 0);
    }
    return sum;
  }, 0);
}
```

### 6.8. HÀM TÍNH LƯƠNG TĂNG CA

```typescript
function calculateLtc(
  userId: string,
  month: string,
  attendanceRecords: AttendanceRecord[],
  dailyWorkCatalog: DailyWorkItem[],
  LCB_dm: number,
  Ctc: number
): number {
  const monthRecords = attendanceRecords.filter(
    r => r.userId === userId && 
    r.date.startsWith(month) && 
    r.status === RecordStatus.APPROVED &&
    r.overtimeHours > 0
  );
  
  let total = 0;
  
  for (const r of monthRecords) {
    let hourlyRate: number;
    
    if (r.isOvertimeWithOutput) {
      // Tăng ca có sản lượng: tính theo LCB
      hourlyRate = (LCB_dm / Ctc) / 8;
    } else {
      // Tăng ca không sản lượng
      if (r.overtimeDailyWorkItemId) {
        // Tính theo đơn giá công nhật
        const item = dailyWorkCatalog.find(i => i.id === r.overtimeDailyWorkItemId);
        hourlyRate = (item?.unitPrice || 0) / 8;
      } else {
        // Tính theo LCB
        hourlyRate = (LCB_dm / Ctc) / 8;
      }
    }
    
    total += r.overtimeHours * hourlyRate * r.otRate;
  }
  
  return total;
}
```

### 6.9. HÀM TÍNH LƯƠNG NGHỈ CÓ LƯƠNG

```typescript
function calculateLncl(
  userId: string,
  month: string,
  attendanceRecords: AttendanceRecord[],
  LCB_dm: number,
  Ctc: number
): number {
  const monthRecords = attendance