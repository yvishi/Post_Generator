import { JSONParseError, NoObjectGeneratedError, TypeValidationError } from 'ai';
import { STAGE_CALL_TIMEOUT_MS } from '../models';

/** A retry with less time left than this would only end in a timeout, so it is skipped. */
const MIN_RETRY_MS = 5_000;

/** The first schema problem in a few words, e.g. "variations: Too small: expected array to have >=3 items". */
function shortCause(e: NoObjectGeneratedError): string {
  if (JSONParseError.isInstance(e.cause)) return 'the reply was not valid JSON';
  if (TypeValidationError.isInstance(e.cause)) {
    const issue = (e.cause.cause as { issues?: { path: PropertyKey[]; message: string }[] } | undefined)?.issues?.[0];
    if (issue) return issue.path.length ? `${issue.path.map(String).join('.')}: ${issue.message}` : issue.message;
  }
  const message = e.cause instanceof Error ? e.cause.message : e.message;
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

/**
 * Runs a structured-output call; if the reply does not match the schema, runs it once more.
 * Both attempts share one STAGE_CALL_TIMEOUT_MS deadline, so a retry cannot push the route past maxDuration.
 * `call` receives the time left for that attempt.
 */
export async function withSchemaRetry<T>(label: string, call: (timeoutMs: number) => Promise<T>): Promise<T> {
  const deadline = Date.now() + STAGE_CALL_TIMEOUT_MS;
  const formatError = (e: NoObjectGeneratedError) =>
    new Error(`The model's ${label} output didn't match the required format twice: ${shortCause(e)}`);

  let first: NoObjectGeneratedError;
  try {
    return await call(STAGE_CALL_TIMEOUT_MS);
  } catch (e) {
    if (!NoObjectGeneratedError.isInstance(e)) throw e;
    first = e;
  }
  const left = deadline - Date.now();
  if (left < MIN_RETRY_MS) {
    throw new Error(`The model's ${label} output didn't match the required format, with no time left to retry: ${shortCause(first)}`);
  }
  try {
    return await call(left);
  } catch (e) {
    throw NoObjectGeneratedError.isInstance(e) ? formatError(e) : e;
  }
}
