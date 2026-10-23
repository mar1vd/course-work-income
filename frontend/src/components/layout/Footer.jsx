// Підвал сторінки
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-3 text-center text-sm text-slate-500 2xl:py-4">
      Інформаційна система обліку доходів і витрат підприємства · {new Date().getFullYear()}
    </footer>
  );
}
