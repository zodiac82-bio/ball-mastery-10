import { useEffect, useRef } from 'react';
import ui from '../styles/ui.module.css';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 앱 안에서 띄우는 확인 대화상자 (브라우저 confirm()을 쓰지 않는다) */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // 실수로 지우지 않게 "취소"에 먼저 초점을 둔다
    if (cancelRef.current) cancelRef.current.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={ui.card + ' ' + styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-message" className={styles.message}>
          {message}
        </p>
        <div className={styles.buttons}>
          <button ref={cancelRef} type="button" className={ui.btn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={ui.btn + ' ' + styles.danger} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
