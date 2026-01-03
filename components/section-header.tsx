import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
}

/**
 * Reusable component for section headers with optional icon and description
 *
 * Example usage:
 * ```tsx
 * <SectionHeader icon={Users} description="Manage administrators">
 *   Administrator Settings
 * </SectionHeader>
 * ```
 */
export function SectionHeader({
  children,
  description,
  icon: Icon,
}: SectionHeaderProps) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 font-bold text-lg">
        {Icon && <Icon className="h-5 w-5" />}
        {children}
      </h2>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
