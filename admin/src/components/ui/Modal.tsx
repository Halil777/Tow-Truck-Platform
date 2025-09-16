import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ open: boolean; title?: string; onClose: () => void; actions?: React.ReactNode }>

export default function Modal({ open, title, onClose, actions, children }: Props) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 520, maxWidth: '90vw' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>{title}</strong>
          <button onClick={onClose}>×</button>
        </div>
        <div className="stack" style={{ marginTop: 8 }}>{children}</div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>{actions}</div>
      </div>
    </div>
  );
}

