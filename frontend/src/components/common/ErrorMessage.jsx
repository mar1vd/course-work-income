import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';

// Інформативне повідомлення про помилку + кнопка повтору (замість «Error 500»)
export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert className="mb-3">
      <div>
        <strong>Щось пішло не так.</strong>
        <div>{error.message}</div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Повторити спробу
        </Button>
      )}
    </Alert>
  );
}
