const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts numbers or English digit strings into Bengali numeral characters
 */
export function toBnNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '০';
  const str = typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString('en-US') : val.toFixed(2)) : val.toString();
  return str.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

/**
 * Formats monetary amounts in Bangladeshi Taka
 * e.g., 15000 -> ৳ ১৫,০০০
 */
export function formatTaka(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  const formatted = Math.round(num).toLocaleString('en-US');
  const bn = formatted.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
  return `৳ ${bn}`;
}

/**
 * Formats standard weight in grams or kilograms with Bengali unit
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = (grams / 1000).toFixed(2);
    return `${toBnNumber(kg)} কেজি (${toBnNumber(grams)} গ্রাম)`;
  }
  return `${toBnNumber(grams)} গ্রাম`;
}

/**
 * Calculate batch age in days from start date
 */
export function calculateBatchAgeDays(startDateStr: string): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const now = new Date();
  
  // Set both to midnight UTC for precise calendar day diff
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = utcNow - utcStart;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1); // Day 1 is the start day
}

/**
 * Format a YYYY-MM-DD date string to Bengali readable format
 */
export function formatBnDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const day = toBnNumber(date.getDate());
    const month = months[date.getMonth()];
    const year = toBnNumber(date.getFullYear());
    return `${day} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get current date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats kilograms into Maund (৪০ কেজি = ১ মণ)
 */
export function formatMaund(kg: number): string {
  if (!kg || kg <= 0) return '০ মণ';
  const maund = (kg / 40).toFixed(1);
  return `${toBnNumber(maund)} মণ`;
}
