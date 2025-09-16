import { forwardRef } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string };

export default forwardRef<HTMLInputElement, Props>(function Input({ label, hint, ...rest }, ref) {
  return (
    <label className="stack" style={{ fontSize: 14 }}>
      {label ? <span className="muted">{label}</span> : null}
      <input ref={ref} {...rest} />
      {hint ? <span className="muted" style={{ fontSize: 12 }}>{hint}</span> : null}
    </label>
  );
});

