import React, { createContext, useContext, useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDanger: boolean;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Підтвердження дії',
        message: options.message,
        confirmText: options.confirmText || 'Підтвердити',
        cancelText: options.cancelText || 'Скасувати',
        isDanger: options.isDanger ?? true,
        resolve,
      });
    });
  };

  const handleCancel = () => {
    if (modalState) {
      modalState.resolve(false);
      setModalState(null);
    }
  };

  const handleConfirm = () => {
    if (modalState) {
      modalState.resolve(true);
      setModalState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState?.isOpen && (
        <div className="modal-backdrop" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', border: '1px solid var(--border)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                {modalState.title}
              </h3>
            </div>
            <div style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
              {modalState.message}
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <button className="btn secondary" type="button" onClick={handleCancel} style={{ padding: '8px 16px' }}>
                {modalState.cancelText}
              </button>
              <button
                className={`btn ${modalState.isDanger ? 'danger' : 'primary'}`}
                type="button"
                onClick={handleConfirm}
                style={{ padding: '8px 16px' }}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
