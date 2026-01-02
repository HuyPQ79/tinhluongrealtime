/**
 * Variable Resolver - Map biến số từ context thành giá trị số
 */

import { User, SalaryGrade, AttendanceRecord, EvaluationRequest, SystemConfig } from '../types';

export interface VariableContext {
  user: User;
  grade?: SalaryGrade;
  attendance: AttendanceRecord[];
  evaluations: EvaluationRequest[];
  systemConfig: SystemConfig;
  // Các giá trị đã tính toán
  Ctc?: number;
  Ctt?: number;
  Cn?: number;
  NCD?: number;
  NL?: number;
  NCL?: number;
  NKL?: number;
  NCV?: number;
  SL_tt?: number;
  LCB_dm?: number;
  LHQ_dm?: number;
  LSL_dm?: number;
  SL_khoan?: number;
  DG_khoan?: number;
  CO_tc?: number;
  TR_tc?: number;
  // Các giá trị khác
  [key: string]: any;
}

/**
 * Resolve giá trị biến số từ context
 * Hỗ trợ cả uppercase và lowercase
 */
export function resolveVariable(
  varName: string,
  context: VariableContext
): number {
  // Thử cả uppercase và lowercase
  const nameUpper = varName.toUpperCase();
  const nameLower = varName.toLowerCase();
  const nameOriginal = varName;
  
  // Các biến số cơ bản từ User và Grade
  switch (name) {
    case 'LCB_DM':
      return Number(context.grade?.baseSalary || 0);
    
    case 'LHQ_DM':
      return context.user.paymentType === 'PIECEWORK' 
        ? 0 
        : Number(context.user.efficiencySalary || 0);
    
    case 'LSL_DM':
      return Number(context.LSL_dm || 0);
    
    case 'SL_KHOAN':
      return Number(context.SL_khoan || 0);
    
    case 'DG_KHOAN':
      return Number(context.DG_khoan || 0);
    
    case 'CTC':
      return Number(context.Ctc || 0);
    
    case 'CTT':
      return Number(context.Ctt || 0);
    
    case 'CN':
      return Number(context.Cn || 0);
    
    case 'NCD':
      return Number(context.NCD || 0);
    
    case 'NL':
      return Number(context.NL || 0);
    
    case 'NCL':
      return Number(context.NCL || 0);
    
    case 'NKL':
      return Number(context.NKL || 0);
    
    case 'NCV':
      return Number(context.NCV || 0);
    
    case 'SL_TT':
      return Number(context.SL_tt || 0);
    
    case 'CO_TC':
      return Number(context.CO_tc || 0);
    
    case 'TR_TC':
      return Number(context.TR_tc || 0);
    
    case 'HS_TN':
      return Number(context.user.seniorityCoefficient || 1.0);
    
    case 'PROBATION_RATE':
      return Number(context.user.probationRate || 100);
    
    case 'NUMBER_OF_DEPENDENTS':
      return Number(context.user.numberOfDependents || 0);
    
    // Các biến từ SystemConfig
    case 'BASE_SALARY':
      return Number(context.systemConfig.baseSalary || 0);
    
    case 'STANDARD_WORK_DAYS':
      return Number(context.systemConfig.standardWorkDays || 26);
    
    case 'MAX_INSURANCE_BASE':
      return Number(context.systemConfig.maxInsuranceBase || 36000000);
    
    case 'INSURANCE_RATE':
      const configExtra = (context.systemConfig.insuranceRules as any) || {};
      return Number(configExtra.insuranceRate || 10.5);
    
    case 'UNION_FEE_RATE':
      const configExtra2 = (context.systemConfig.insuranceRules as any) || {};
      return Number(configExtra2.unionFeeRate || 1);
    
    case 'PERSONAL_RELIEF':
      const configExtra3 = (context.systemConfig.insuranceRules as any) || {};
      return Number(configExtra3.personalRelief || 11000000);
    
    case 'DEPENDENT_RELIEF':
      const configExtra4 = (context.systemConfig.insuranceRules as any) || {};
      return Number(configExtra4.dependentRelief || 4400000);
  }
  
  // Nếu không tìm thấy, trả về 0 hoặc throw error
  // (Có thể mở rộng để lấy từ salary_variables table)
  return 0;
}

/**
 * Build context từ dữ liệu thực tế
 */
export function buildVariableContext(
  user: User,
  grade: SalaryGrade | undefined,
  attendance: AttendanceRecord[],
  evaluations: EvaluationRequest[],
  systemConfig: SystemConfig,
  calculatedValues: {
    Ctc: number;
    Ctt: number;
    Cn: number;
    NCD: number;
    NL: number;
    NCL: number;
    NKL: number;
    NCV: number;
    SL_tt: number;
    LCB_dm: number;
    LHQ_dm: number;
    LSL_dm: number;
    SL_khoan: number;
    DG_khoan: number;
    CO_tc: number;
    TR_tc: number;
  }
): VariableContext {
  return {
    user,
    grade,
    attendance,
    evaluations,
    systemConfig,
    ...calculatedValues
  };
}

/**
 * Resolve tất cả biến số từ context thành object để dùng trong formula
 */
export function resolveAllVariables(context: VariableContext): Record<string, number> {
  // Danh sách tất cả biến số có sẵn
  const allVars = [
    'LCB_dm', 'LHQ_dm', 'LSL_dm', 'SL_khoan', 'DG_khoan',
    'Ctc', 'Ctt', 'Cn', 'NCD', 'NL', 'NCL', 'NKL', 'NCV', 'SL_tt',
    'CO_tc', 'TR_tc', 'HS_tn', 'PROBATION_RATE', 'NUMBER_OF_DEPENDENTS',
    'BASE_SALARY', 'STANDARD_WORK_DAYS', 'MAX_INSURANCE_BASE',
    'INSURANCE_RATE', 'UNION_FEE_RATE', 'PERSONAL_RELIEF', 'DEPENDENT_RELIEF'
  ];
  
  const resolved: Record<string, number> = {};
  allVars.forEach(varName => {
    resolved[varName] = resolveVariable(varName, context);
  });
  
  return resolved;
}

