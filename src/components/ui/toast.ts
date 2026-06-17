import { toast as heroToast } from "@heroui/react";

type ToastOptions = {
  description?: React.ReactNode;
  duration?: number;
};

function normalizeOptions(options?: ToastOptions) {
  return {
    description: options?.description,
    timeout: options?.duration ?? 3600,
  };
}

export const toast = {
  success(message: React.ReactNode, options?: ToastOptions) {
    return heroToast.success(message, normalizeOptions(options));
  },
  error(message: React.ReactNode, options?: ToastOptions) {
    return heroToast.danger(message, normalizeOptions(options));
  },
  message(message: React.ReactNode, options?: ToastOptions) {
    return heroToast.info(message, normalizeOptions(options));
  },
  info(message: React.ReactNode, options?: ToastOptions) {
    return heroToast.info(message, normalizeOptions(options));
  },
  warning(message: React.ReactNode, options?: ToastOptions) {
    return heroToast.warning(message, normalizeOptions(options));
  },
};
