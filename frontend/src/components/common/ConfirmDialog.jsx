import Modal from './Modal.jsx';
import Button from '../ui/Button.jsx';

// Підтвердження небезпечної дії з можливістю скасування — «контроль користувача»
export default function ConfirmDialog({ title = 'Підтвердження', message, confirmText = 'Видалити', busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel}>
      <p className="mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Скасувати
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Видалення…' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
