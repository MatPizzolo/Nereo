import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

const variantConfig: Record<
  string,
  { icon: LucideIcon; className: string }
> = {
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-green-200 bg-green-50 text-green-900 [&>svg]:text-green-600",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600",
  },
};

export interface InlineAlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineAlert({
  variant = "info",
  title,
  children,
  className,
}: InlineAlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.className, className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
