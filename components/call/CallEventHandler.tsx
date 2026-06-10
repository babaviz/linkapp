/**
 * CallEventHandler (legacy)
 *
 * The call flow is now driven by:
 * - `StreamVideoWrapper` (single client initialization)
 * - `RingingCallsHandler` (`useCalls()` for incoming ringing calls)
 * - Stream `CallingState` transitions inside the call UI
 *
 * This component remains as a safe no-op to avoid import/runtime issues.
 */
export function CallEventHandler() {
  return null;
}

