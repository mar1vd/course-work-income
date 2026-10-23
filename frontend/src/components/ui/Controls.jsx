// Спільні Tailwind-класи для полів введення; aria-invalid: підсвічує поле з помилкою червоним
const control =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-600';

export const Input = ({ className = '', ...props }) => <input className={`${control} h-10 ${className}`} {...props} />;

export const Select = ({ className = '', ...props }) => <select className={`${control} h-10 ${className}`} {...props} />;

export const Textarea = ({ className = '', ...props }) => <textarea className={`${control} ${className}`} {...props} />;
