import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateLogin } from '../utils/validators.js';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Controls.jsx';

// Демо-акаунти для швидкого входу (підставляють e-mail і пароль у форму)
const DEMO_ACCOUNTS = [
  { label: 'Бухгалтер', email: 'accountant@demo.com', password: 'demo1234' },
  { label: 'Адміністратор', email: 'admin@demo.com', password: 'admin1234' },
  { label: 'Керівник відділу', email: 'manager@demo.com', password: 'manager1234' },
];

// Сторінка входу: валідація полів, показ помилки сервера, блокування кнопки під час запиту
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // уже авторизований — на головну
  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  // Валідація -> login() (POST /auth/login) -> перехід туди, куди користувач йшов
  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      await login(values.email, values.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      setServerError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7">
        <h1 className="text-2xl font-bold">Вхід у систему</h1>
        <p className="text-slate-500">Облік доходів і витрат підприємства</p>

        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="username" value={values.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} />
          </Field>
          <Field label="Пароль" htmlFor="password" error={errors.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={handleChange} aria-invalid={Boolean(errors.password)} />
          </Field>
          {serverError && <Alert>{serverError}</Alert>}
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Вхід…' : 'Увійти'}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <p className="basis-full text-slate-500">Демо-акаунти (натисніть, щоб підставити):</p>
          {DEMO_ACCOUNTS.map((a) => (
            <Button key={a.email} variant="outline" size="sm" onClick={() => setValues({ email: a.email, password: a.password })}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
