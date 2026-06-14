export const AVATAR_COLORS = [
  "#7C3AED", // Purple
  "#2563EB", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
];

export function getAvatarColor(identifier: string, role?: string): string {
  // Ата-ана үшін бейтарап сұр түс
  if (role === 'parent') return '#64748b'; 
  
  if (!identifier) return AVATAR_COLORS[0];
  
  // Хэш арқылы әрқашан бір адамға бір түс түсуін қамтамасыз етеміз
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(name?: string): string {
  if (!name) return 'NA';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
