interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[inputBase, props.className ?? ''].join(' ')} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[inputBase, props.className ?? ''].join(' ')} />;
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  };
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98]',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
