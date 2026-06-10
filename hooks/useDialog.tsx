/**
 * useDialog Hook
 * Provides easy-to-use dialog functionality with a context-based approach
 * Replaces Alert.alert and Alert.prompt with polished custom dialogs
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogProps, DialogButton } from '../components/common/Dialog';
import { PromptDialog, PromptDialogProps, PromptDialogButton } from '../components/common/PromptDialog';

interface DialogContextType {
  showDialog: (props: Omit<DialogProps, 'visible'>) => Promise<void>;
  showPrompt: (props: Omit<PromptDialogProps, 'visible'>) => Promise<string | null>;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode; isDarkMode?: boolean }> = ({
  children,
  isDarkMode = false,
}) => {
  const [dialogProps, setDialogProps] = useState<DialogProps | null>(null);
  const [promptProps, setPromptProps] = useState<PromptDialogProps | null>(null);
  const [resolveDialog, setResolveDialog] = useState<(() => void) | null>(null);
  const [resolvePrompt, setResolvePrompt] = useState<((value: string | null) => void) | null>(null);

  const showDialog = useCallback((props: Omit<DialogProps, 'visible'>): Promise<void> => {
    return new Promise((resolve) => {
      // Wrap button handlers to resolve promise
      const wrappedButtons: DialogButton[] = props.buttons?.map((button) => ({
        ...button,
        onPress: () => {
          if (button.onPress) {
            button.onPress();
          }
          setDialogProps(null);
          setResolveDialog(null);
          resolve();
        },
      })) || [];

      setDialogProps({
        ...props,
        visible: true,
        buttons: wrappedButtons,
        isDarkMode,
        onClose: () => {
          if (props.onClose) {
            props.onClose();
          }
          setDialogProps(null);
          setResolveDialog(null);
          resolve();
        },
      });
      setResolveDialog(() => resolve);
    });
  }, [isDarkMode]);

  const showPrompt = useCallback((props: Omit<PromptDialogProps, 'visible'>): Promise<string | null> => {
    return new Promise((resolve) => {
      // Wrap button handlers to resolve promise with input value
      const wrappedButtons: PromptDialogButton[] = props.buttons?.map((button) => ({
        ...button,
        onPress: async (input: string) => {
          if (button.onPress) {
            await button.onPress(input);
          }
          
          const result = button.style === 'cancel' ? null : input;
          setPromptProps(null);
          setResolvePrompt(null);
          resolve(result);
        },
      })) || [];

      setPromptProps({
        ...props,
        visible: true,
        buttons: wrappedButtons,
        isDarkMode,
        onClose: () => {
          if (props.onClose) {
            props.onClose();
          }
          setPromptProps(null);
          setResolvePrompt(null);
          resolve(null);
        },
      });
      setResolvePrompt(() => resolve);
    });
  }, [isDarkMode]);

  const hideDialog = useCallback(() => {
    if (dialogProps) {
      setDialogProps(null);
      if (resolveDialog) {
        resolveDialog();
        setResolveDialog(null);
      }
    }
    if (promptProps) {
      setPromptProps(null);
      if (resolvePrompt) {
        resolvePrompt(null);
        setResolvePrompt(null);
      }
    }
  }, [dialogProps, promptProps, resolveDialog, resolvePrompt]);

  return (
    <DialogContext.Provider value={{ showDialog, showPrompt, hideDialog }}>
      {children}
      {dialogProps && <Dialog {...dialogProps} />}
      {promptProps && <PromptDialog {...promptProps} />}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

// Convenience functions that work without context (for simple cases)
let globalDialogProvider: DialogContextType | null = null;

export const setGlobalDialogProvider = (provider: DialogContextType) => {
  globalDialogProvider = provider;
};

export const showDialog = (props: Omit<DialogProps, 'visible'>): Promise<void> => {
  if (globalDialogProvider) {
    return globalDialogProvider.showDialog(props);
  }
  throw new Error('Dialog provider not initialized. Wrap your app with DialogProvider.');
};

export const showPrompt = (props: Omit<PromptDialogProps, 'visible'>): Promise<string | null> => {
  if (globalDialogProvider) {
    return globalDialogProvider.showPrompt(props);
  }
  throw new Error('Dialog provider not initialized. Wrap your app with DialogProvider.');
};

export default useDialog;

