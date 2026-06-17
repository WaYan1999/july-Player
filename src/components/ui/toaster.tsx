import { Toast } from "@heroui/react";

export function Toaster() {
  return (
    <Toast.Provider
      placement="bottom end"
      maxVisibleToasts={4}
      width="min(420px, calc(100vw - 32px))"
      className="july-toast-region"
    />
  );
}
