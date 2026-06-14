/**
 * Стандартты уақыт форматына келтіру (КК.АА.ЖЖЖЖ)
 */
export function formatDate(timestamp: any): string {
  if (!timestamp) return '—';
  
  // Егер Firebase Timestamp болса
  const date = typeof timestamp?.toDate === 'function' 
    ? timestamp.toDate() 
    : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    
  if (isNaN(date.getTime())) return '—';
  
  return date.toLocaleDateString('kk-KZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
