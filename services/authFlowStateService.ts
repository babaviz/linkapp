type RecoveryState = {
  inProgress: boolean;
  startedAtMs: number | null;
};

const PASSWORD_RECOVERY_TTL_MS = 30 * 60 * 1000; // 30 minutes

const state: RecoveryState = {
  inProgress: false,
  startedAtMs: null,
};

export function startPasswordRecoveryFlow(): void {
  state.inProgress = true;
  state.startedAtMs = Date.now();
}

export function clearPasswordRecoveryFlow(): void {
  state.inProgress = false;
  state.startedAtMs = null;
}

export function isPasswordRecoveryFlowActive(): boolean {
  if (!state.inProgress) return false;
  if (state.startedAtMs === null) return false;

  if (Date.now() - state.startedAtMs > PASSWORD_RECOVERY_TTL_MS) {
    clearPasswordRecoveryFlow();
    return false;
  }

  return true;
}

