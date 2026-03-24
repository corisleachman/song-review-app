// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Get avatar colors based on name
export function getAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: '#3b82f6', text: '#ffffff' }, // Blue
    { bg: '#a855f7', text: '#ffffff' }, // Purple
    { bg: '#06b6d4', text: '#ffffff' }, // Cyan
    { bg: '#ec4899', text: '#ffffff' }, // Pink
    { bg: '#f59e0b', text: '#ffffff' }, // Amber
    { bg: '#10b981', text: '#ffffff' }, // Green
  ];

  const hash = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return colors[hash % colors.length];
}

// Avatar component
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = getInitials(name);
  const { bg, text } = getAvatarColor(name);

  const sizeClass = {
    sm: 'width: 28px; height: 28px; font-size: 11px;',
    md: 'width: 36px; height: 36px; font-size: 13px;',
    lg: 'width: 48px; height: 48px; font-size: 16px;',
  }[size];

  return `
    <div style="
      ${sizeClass}
      background: ${bg};
      color: ${text};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    ">
      ${initials}
    </div>
  `;
}
