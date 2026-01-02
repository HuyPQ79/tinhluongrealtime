/**
 * Formula Engine - Parse và Evaluate công thức động
 * Hỗ trợ: +, -, *, /, dấu ngoặc, biến số, số thực
 */

export interface FormulaContext {
  [key: string]: number | string | boolean | null | undefined;
}

export interface FormulaResult {
  value: number;
  error?: string;
}

/**
 * Parse và Evaluate công thức
 * 
 * @param expression - Công thức dạng string, ví dụ: "(LCB_dm / Ctc) * Ctt"
 * @param context - Context chứa giá trị các biến số
 * @returns Kết quả tính toán hoặc lỗi
 * 
 * Ví dụ:
 * evaluate("(LCB_dm / Ctc) * Ctt", { LCB_dm: 8000000, Ctc: 26, Ctt: 24 })
 * → (8000000 / 26) * 24 = 7,384,615
 */
export function evaluateFormula(
  expression: string,
  context: FormulaContext
): FormulaResult {
  try {
    // Normalize: Loại bỏ khoảng trắng, chuyển {VAR} thành VAR
    const normalized = expression
      .replace(/\s+/g, '') // Loại bỏ khoảng trắng
      .replace(/\{([^}]+)\}/g, '$1'); // {VAR} → VAR
    
    if (!normalized) {
      return { value: 0, error: 'Công thức rỗng' };
    }

    // Parse và evaluate
    let pos = 0;
    const result = parseExpression(normalized, context, pos);
    
    if (result.error) {
      return { value: 0, error: result.error };
    }
    
    if (pos < normalized.length) {
      return { value: 0, error: `Ký tự không hợp lệ tại vị trí ${pos + 1}` };
    }
    
    return { value: result.value };
  } catch (error: any) {
    return { value: 0, error: error.message || 'Lỗi không xác định' };
  }
}

/**
 * Parse expression (hỗ trợ + và -)
 */
function parseExpression(
  expr: string,
  context: FormulaContext,
  pos: { current: number }
): { value: number; error?: string } {
  let result = parseTerm(expr, context, pos);
  if (result.error) return result;
  
  let value = result.value;
  
  while (pos.current < expr.length) {
    const op = expr[pos.current];
    if (op === '+') {
      pos.current++;
      const right = parseTerm(expr, context, pos);
      if (right.error) return right;
      value += right.value;
    } else if (op === '-') {
      pos.current++;
      const right = parseTerm(expr, context, pos);
      if (right.error) return right;
      value -= right.value;
    } else {
      break;
    }
  }
  
  return { value };
}

/**
 * Parse term (hỗ trợ * và /)
 */
function parseTerm(
  expr: string,
  context: FormulaContext,
  pos: { current: number }
): { value: number; error?: string } {
  let result = parseFactor(expr, context, pos);
  if (result.error) return result;
  
  let value = result.value;
  
  while (pos.current < expr.length) {
    const op = expr[pos.current];
    if (op === '*') {
      pos.current++;
      const right = parseFactor(expr, context, pos);
      if (right.error) return right;
      value *= right.value;
    } else if (op === '/') {
      pos.current++;
      const right = parseFactor(expr, context, pos);
      if (right.error) return right;
      if (right.value === 0) {
        return { value: 0, error: 'Chia cho 0' };
      }
      value /= right.value;
    } else {
      break;
    }
  }
  
  return { value };
}

/**
 * Parse factor (số, biến số, hoặc expression trong ngoặc)
 */
function parseFactor(
  expr: string,
  context: FormulaContext,
  pos: { current: number }
): { value: number; error?: string } {
  if (pos.current >= expr.length) {
    return { value: 0, error: 'Thiếu toán hạng' };
  }
  
  // Dấu ngoặc mở
  if (expr[pos.current] === '(') {
    pos.current++;
    const result = parseExpression(expr, context, pos);
    if (result.error) return result;
    
    if (pos.current >= expr.length || expr[pos.current] !== ')') {
      return { value: 0, error: 'Thiếu dấu ngoặc đóng' };
    }
    pos.current++;
    return result;
  }
  
  // Dấu trừ unary
  if (expr[pos.current] === '-') {
    pos.current++;
    const result = parseFactor(expr, context, pos);
    if (result.error) return result;
    return { value: -result.value };
  }
  
  // Dấu cộng unary (bỏ qua)
  if (expr[pos.current] === '+') {
    pos.current++;
    return parseFactor(expr, context, pos);
  }
  
  // Số hoặc biến số
  const start = pos.current;
  
  // Đọc số hoặc tên biến
  if (isDigit(expr[pos.current]) || expr[pos.current] === '.') {
    // Đọc số
    while (pos.current < expr.length && (isDigit(expr[pos.current]) || expr[pos.current] === '.')) {
      pos.current++;
    }
    const numStr = expr.substring(start, pos.current);
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      return { value: 0, error: `Số không hợp lệ: ${numStr}` };
    }
    return { value: num };
  }
  
  // Đọc tên biến (chữ cái, số, dấu gạch dưới)
  if (isLetter(expr[pos.current]) || expr[pos.current] === '_') {
    while (pos.current < expr.length && (isLetter(expr[pos.current]) || isDigit(expr[pos.current]) || expr[pos.current] === '_')) {
      pos.current++;
    }
    const varName = expr.substring(start, pos.current);
    
    // Lấy giá trị từ context
    const varValue = context[varName];
    if (varValue === undefined || varValue === null) {
      return { value: 0, error: `Biến số không tồn tại: ${varName}` };
    }
    
    const num = typeof varValue === 'number' ? varValue : parseFloat(String(varValue));
    if (isNaN(num)) {
      return { value: 0, error: `Giá trị biến số không hợp lệ: ${varName} = ${varValue}` };
    }
    
    return { value: num };
  }
  
  return { value: 0, error: `Ký tự không hợp lệ: ${expr[pos.current]}` };
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isLetter(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

/**
 * Validate công thức (kiểm tra syntax và biến số)
 */
export function validateFormula(
  expression: string,
  availableVars: string[]
): { valid: boolean; error?: string; missingVars?: string[] } {
  try {
    const normalized = expression
      .replace(/\s+/g, '')
      .replace(/\{([^}]+)\}/g, '$1');
    
    if (!normalized) {
      return { valid: false, error: 'Công thức rỗng' };
    }
    
    // Extract tất cả biến số từ công thức
    const varPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const matches = normalized.match(varPattern);
    const usedVars = matches ? [...new Set(matches.filter(v => !isNumericString(v)))] : [];
    
    // Kiểm tra biến số có tồn tại không
    const missingVars = usedVars.filter(v => !availableVars.includes(v));
    
    if (missingVars.length > 0) {
      return {
        valid: false,
        error: `Biến số không tồn tại: ${missingVars.join(', ')}`,
        missingVars
      };
    }
    
    // Test evaluate với giá trị mẫu
    const testContext: FormulaContext = {};
    availableVars.forEach(v => {
      testContext[v] = 1; // Giá trị mẫu
    });
    
    const result = evaluateFormula(expression, testContext);
    if (result.error) {
      return { valid: false, error: result.error };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Lỗi validate' };
  }
}

function isNumericString(str: string): boolean {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

