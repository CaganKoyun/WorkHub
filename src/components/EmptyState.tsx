import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "py-8 px-6" : "py-14 px-8",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-muted/60",
            compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4",
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground",
              compact ? "h-5 w-5" : "h-7 w-7",
            )}
          />
        </div>
        <h3
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-sm" : "text-base",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "text-muted-foreground mt-1.5 max-w-sm",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
        {(action || secondaryAction || children) && (
          <div className="mt-5 flex items-center gap-2">
            {action && (
              <Button size={compact ? "sm" : "default"} onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
