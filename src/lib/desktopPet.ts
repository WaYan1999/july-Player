export const DESKTOP_PET_READY_EVENT = "july-player:desktop-pet-ready";
export const DESKTOP_PET_CLOSE_REQUEST_EVENT = "july-player:desktop-pet-close-request";
export const DESKTOP_PET_WINDOW_LABEL = "july-desktop-pet";

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Operation timed out",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
