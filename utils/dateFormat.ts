/**
 * Utility functions for date formatting
 * Format: dd/mm/yyyy for display and input
 */

/**
 * Convert YYYY-MM-DD to dd/mm/yyyy
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  // Nếu đã là format YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  // Nếu là ISO string hoặc Date object
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Convert dd/mm/yyyy to YYYY-MM-DD (for input type="date")
 */
export const formatDateInput = (dateStr: string): string => {
  if (!dateStr) return '';
  // Nếu đã là YYYY-MM-DD, return luôn
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  // Nếu là dd/mm/yyyy
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  // Nếu là ISO string
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date time theo dd/mm/yyyy HH:mm
 */
export const formatDateTimeDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

