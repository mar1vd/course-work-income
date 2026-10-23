// Обгортка поля форми: підпис (label) зверху і текст помилки під полем
export default function Field({ label, htmlFor, error, className = '', children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
