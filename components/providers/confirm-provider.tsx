"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  cancelText?: string;
  confirmText?: string;
  description?: string;
  title?: string;
  variant?: "default" | "destructive";
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        cancelText: "キャンセル",
        confirmText: "OK",
        description: "本当に実行しますか？",
        title: "確認",
        variant: "default",
        ...opts,
      });
      setResolveRef(() => resolve);
    });
  }, []);

  const handleClose = (value: boolean) => {
    setOptions(null);
    if (resolveRef) {
      resolveRef(value);
      setResolveRef(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <AlertDialog onOpenChange={() => handleClose(false)} open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleClose(false)}>
                {options.cancelText}
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  options.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
                onClick={() => handleClose(true)}
              >
                {options.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
