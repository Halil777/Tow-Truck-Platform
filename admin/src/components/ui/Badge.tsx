type Props = { color?: 'gray' | 'green' | 'red' | 'blue' | 'yellow'; children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>;

export default function Badge({ color = 'gray', children, className, ...rest }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    gray: { background: 'var(--border)', color: 'var(--text)' },
    green: { background: '#16a34a20', color: '#16a34a' },
    red: { background: '#dc262620', color: '#dc2626' },
    blue: { background: '#2563eb20', color: '#2563eb' },
    yellow: { background: '#ca8a0420', color: '#ca8a04' },
  };
  return (
    <span className={`badge ${className || ''}`} style={{ padding: '3px 8px', borderRadius: 999, fontSize: 12, ...styles[color] }} {...rest}>
      {children}
    </span>
  );
}
import type React from 'react';
