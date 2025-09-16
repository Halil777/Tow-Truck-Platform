import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ title?: string; extra?: React.ReactNode; } & React.HTMLAttributes<HTMLDivElement>>;

export default function Card({ title, extra, children, ...rest }: Props) {
  return (
    <div className="card" {...rest}>
      {(title || extra) && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>{title}</strong>
          <div>{extra}</div>
        </div>
      )}
      {children}
    </div>
  );
}

