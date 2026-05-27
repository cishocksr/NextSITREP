type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const styles: Record<AlertVariant, string> = {
  error: "bg-red-50 border-red-300 text-red-800",
  success: "bg-green-50 border-green-300 text-green-800",
  warning: "bg-amber-50 border-amber-300 text-amber-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export function Alert({
  variant = "info",
  title,
  message,
  onDismiss,
}: AlertProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <p>{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
