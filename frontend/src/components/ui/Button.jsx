// Варіанти вигляду кнопки (Tailwind-класи); enabled: прибирає підсвічування для заблокованих кнопок
const variants = {
  primary: 'border-transparent bg-blue-600 text-white enabled:hover:bg-blue-700',
  outline: 'border-slate-300 bg-white text-slate-800 enabled:hover:bg-slate-100',
  ghost: 'border-transparent bg-transparent text-blue-600 enabled:hover:bg-blue-50',
  danger: 'border-transparent bg-red-600 text-white enabled:hover:bg-red-700',
  dangerGhost: 'border-transparent bg-transparent text-red-600 enabled:hover:bg-red-50',
};

// Розміри кнопки
const sizes = {
  md: 'px-4 py-2',
  sm: 'px-2.5 py-1 text-sm',
};

// Єдина кнопка застосунку: variant — вигляд, size — розмір, block — на всю ширину.
// type="button" за замовчуванням, щоб кнопка у формі випадково не відправляла її.
export default function Button({ variant = 'primary', size = 'md', block = false, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={[
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
