/**
 * Dialog Service
 * A simple service for showing dialogs without requiring context
 * Provides easy migration from Alert.alert to custom dialogs
 */

import React, { useState } from 'react';
import { Dialog, DialogButton } from '../components/common/Dialog';
import { PromptDialog, PromptDialogButton } from '../components/common/PromptDialog';

interface DialogState {
  visible: boolean;
  props: Record<string, unknown> | null;
}

let setDialogStateGlobal: ((state: DialogState) => void) | null = null;
let setPromptStateGlobal: ((state: DialogState) => void) | null = null;

// Dialog Container Component - Must be rendered at root level
export const DialogContainer: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const [dialogState, setDialogState] = useState<DialogState>({ visible: false, props: null });
  const [promptState, setPromptState] = useState<DialogState>({ visible: false, props: null });

  React.useEffect(() => {
    setDialogStateGlobal = setDialogState;
    setPromptStateGlobal = setPromptState;
    return () => {
      setDialogStateGlobal = null;
      setPromptStateGlobal = null;
    };
  }, []);

  return (
    <>
      {dialogState.visible && dialogState.props && (
        <Dialog {...(dialogState.props as unknown as Omit<React.ComponentProps<typeof Dialog>, 'visible'>)} visible={dialogState.visible} isDarkMode={isDarkMode} />
      )}
      {promptState.visible && promptState.props && (
        <PromptDialog {...(promptState.props as unknown as Omit<React.ComponentProps<typeof PromptDialog>, 'visible'>)} visible={promptState.visible} isDarkMode={isDarkMode} />
      )}
    </>
  );
};

// Dialog Service Functions
export const showDialog = (props: {
  title?: string;
  message?: string;
  children?: React.ReactNode;
  buttons?: DialogButton[];
  icon?: {
    name: keyof typeof import('@expo/vector-icons').MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  isDarkMode?: boolean;
  dismissOnBackdrop?: boolean;
  accessibilityLabel?: string;
}): Promise<void> => {
  return new Promise((resolve) => {
    if (!setDialogStateGlobal) {
      // DialogContainer not mounted - silently resolve to prevent errors
      resolve();
      return;
    }

    const wrappedButtons: DialogButton[] = props.buttons?.map((button) => ({
      ...button,
      onPress: async () => {
        if (button.onPress) {
          await button.onPress();
        }
        setDialogStateGlobal?.({ visible: false, props: null });
        resolve();
      },
    })) || [
      {
        text: 'OK',
        style: 'default',
        onPress: () => {
          setDialogStateGlobal?.({ visible: false, props: null });
          resolve();
        },
      },
    ];

    setDialogStateGlobal({
      visible: true,
      props: {
        ...props,
        buttons: wrappedButtons,
        onClose: () => {
          setDialogStateGlobal?.({ visible: false, props: null });
          resolve();
        },
      },
    });
  });
};

export const showPrompt = (props: {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'plain-text' | 'secure-text' | 'numeric' | 'email';
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  buttons?: PromptDialogButton[];
  icon?: {
    name: keyof typeof import('@expo/vector-icons').MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  validate?: (input: string) => boolean | string;
  isDarkMode?: boolean;
  dismissOnBackdrop?: boolean;
  accessibilityLabel?: string;
}): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!setPromptStateGlobal) {
      // DialogContainer not mounted - silently resolve to prevent errors
      resolve(null);
      return;
    }

    const wrappedButtons: PromptDialogButton[] = props.buttons?.map((button) => ({
      ...button,
      onPress: async (input: string) => {
        if (button.onPress) {
          await button.onPress(input);
        }
        const result = button.style === 'cancel' ? null : input;
        setPromptStateGlobal?.({ visible: false, props: null });
        resolve(result);
      },
    })) || [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          setPromptStateGlobal?.({ visible: false, props: null });
          resolve(null);
        },
      },
      {
        text: 'OK',
        style: 'default',
        onPress: (input: string) => {
          setPromptStateGlobal?.({ visible: false, props: null });
          resolve(input);
        },
      },
    ];

    setPromptStateGlobal({
      visible: true,
      props: {
        ...props,
        buttons: wrappedButtons,
        onClose: () => {
          setPromptStateGlobal?.({ visible: false, props: null });
          resolve(null);
        },
      },
    });
  });
};

