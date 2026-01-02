import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Calculator, AlertCircle, CheckCircle, GripVertical } from 'lucide-react';
import { SalaryVariable } from '../../types';

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables: SalaryVariable[];
  onValidate?: (isValid: boolean, error?: string) => void;
}

/**
 * Formula Editor với autocomplete và drag-drop
 * Không cần gõ {} - tự động thêm khi chọn biến số
 */
export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  value,
  onChange,
  variables,
  onValidate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter variables based on search
  const filteredVariables = variables.filter(v =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  // Group variables by group
  const groupedVariables = variables.reduce((acc, v) => {
    const group = v.group || 'KHÁC';
    if (!acc[group]) acc[group] = [];
    acc[group].push(v);
    return acc;
  }, {} as Record<string, SalaryVariable[]>);

  // Insert variable at cursor position - thay thế text đã gõ
  const insertVariable = (varCode: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBeforeCursor = value.substring(0, start);
    
    // Tìm từ cuối cùng đã gõ (để thay thế)
    const lastWordMatch = textBeforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
    const lastWordStart = lastWordMatch ? textBeforeCursor.lastIndexOf(lastWordMatch[0]) : start;
    
    // Thay thế từ đã gõ bằng biến số được chọn
    const before = value.substring(0, lastWordStart);
    const after = value.substring(end);
    const newValue = before + varCode + after;
    onChange(newValue);
    
    // Set cursor after inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPos = lastWordStart + varCode.length;
      textarea.setSelectionRange(newPos, newPos);
      setCursorPosition(newPos);
    }, 0);
    
    setShowSuggestions(false);
    setSearchTerm('');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setCursorPosition(e.target.selectionStart);
    
    // Show suggestions if typing variable-like text
    const textBeforeCursor = newValue.substring(0, e.target.selectionStart);
    const lastWord = textBeforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/)?.[0] || '';
    
    if (lastWord.length >= 1) {
      setSearchTerm(lastWord);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSearchTerm('');
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredVariables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredVariables.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredVariables.length) % filteredVariables.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertVariable(filteredVariables[selectedIndex].code);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSearchTerm('');
      }
    }
  };

  // Validate formula
  useEffect(() => {
    if (onValidate) {
      // Basic validation: check for balanced parentheses
      const openParens = (value.match(/\(/g) || []).length;
      const closeParens = (value.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        const error = 'Số lượng dấu ngoặc mở và đóng không khớp';
        setValidationError(error);
        onValidate(false, error);
        return;
      }
      
      // Check for invalid characters
      const invalidChars = value.match(/[^a-zA-Z0-9_+\-*/().\s]/g);
      if (invalidChars && invalidChars.length > 0) {
        const error = `Ký tự không hợp lệ: ${invalidChars.join(', ')}`;
        setValidationError(error);
        onValidate(false, error);
        return;
      }
      
      setValidationError(null);
      onValidate(true);
    }
  }, [value, onValidate]);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedEl = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  // Drag handlers
  const handleDragStart = (varCode: string) => {
    setIsDragging(varCode);
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const varCode = e.dataTransfer.getData('text/plain');
    if (varCode) {
      const textarea = inputRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Approximate cursor position (simplified)
        const lineHeight = 20;
        const charWidth = 8;
        const line = Math.floor(y / lineHeight);
        const col = Math.floor(x / charWidth);
        const approximatePos = Math.min(value.length, line * 50 + col);
        
        textarea.focus();
        textarea.setSelectionRange(approximatePos, approximatePos);
        insertVariable(varCode);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Editor */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onFocus={() => {
            if (searchTerm) setShowSuggestions(true);
          }}
          onBlur={() => {
            // Delay to allow click on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className="w-full px-4 py-4 border-2 border-indigo-50 rounded-2xl font-mono text-sm min-h-[120px] bg-slate-950 text-indigo-400 focus:border-indigo-400 focus:outline-none resize-y"
          placeholder="Nhập công thức hoặc kéo thả biến số từ bên dưới..."
        />
        
        {/* Autocomplete Suggestions */}
        {showSuggestions && filteredVariables.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-2 bg-white border-2 border-indigo-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto"
            style={{ top: '100%', left: 0, right: 0 }}
          >
            {filteredVariables.map((v, idx) => (
              <div
                key={v.code}
                onMouseDown={(e) => {
                  e.preventDefault(); // Ngăn textarea mất focus trước khi click
                  insertVariable(v.code);
                }}
                className={`px-4 py-3 cursor-pointer transition-all flex items-center justify-between ${
                  idx === selectedIndex
                    ? 'bg-indigo-50 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-black text-indigo-600">{v.code}</code>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-sm font-bold text-slate-700">{v.name}</span>
                  </div>
                  {v.desc && (
                    <p className="text-xs text-slate-400 mt-1 italic">{v.desc}</p>
                  )}
                </div>
                <span className="text-xs text-slate-300 ml-4">Enter</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Status */}
      {validationError ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle size={16} className="text-rose-600" />
          <span className="text-xs font-bold text-rose-600">{validationError}</span>
        </div>
      ) : value && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle size={16} className="text-emerald-600" />
          <span className="text-xs font-bold text-emerald-600">Công thức hợp lệ</span>
        </div>
      )}

      {/* Variable Palette - Drag & Drop */}
      <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50">
        <div className="flex items-center gap-2 mb-4">
          <GripVertical size={16} className="text-slate-400" />
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">
            Kéo thả biến số vào công thức
          </h4>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {Object.entries(groupedVariables).map(([group, vars]) => (
            <div key={group} className="space-y-2">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                {group}
              </h5>
              <div className="flex flex-wrap gap-2">
                {vars.map(v => (
                  <div
                    key={v.code}
                    draggable
                    onDragStart={() => handleDragStart(v.code)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      inputRef.current?.focus();
                      insertVariable(v.code);
                    }}
                    className={`px-3 py-2 bg-white border-2 rounded-xl cursor-move hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-2 group ${
                      isDragging === v.code ? 'opacity-50' : 'border-slate-200'
                    }`}
                  >
                    <GripVertical size={12} className="text-slate-300 group-hover:text-indigo-600" />
                    <code className="text-xs font-black text-indigo-600">{v.code}</code>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-600">{v.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Operators */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest self-center mr-2">
          Toán tử:
        </span>
        {['+', '-', '*', '/', '(', ')'].map(op => (
          <button
            key={op}
            type="button"
            onClick={() => {
              const textarea = inputRef.current;
              if (textarea) {
                const start = textarea.selectionStart;
                const before = value.substring(0, start);
                const after = value.substring(start);
                onChange(before + op + after);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 1, start + 1);
                }, 0);
              }
            }}
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-mono text-lg font-black text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
};

