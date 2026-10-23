// Червоне повідомлення про помилку (role="alert" — його озвучують скринрідери)
export default function Alert({ className = '', children }) {
  return (
    <div role="alert" className={`flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-900 ${className}`}>
      {children}
    </div>
  );
}
