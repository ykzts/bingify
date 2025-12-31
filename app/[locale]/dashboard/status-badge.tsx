import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  status: string;
}

export function StatusBadge({ label, status }: StatusBadgeProps) {
  if (status === "active") {
    return (
      <Badge
        className={cn(
          "border-transparent bg-green-100 text-green-800",
          "inline-flex items-center gap-1.5"
        )}
        variant="secondary"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        {label}
      </Badge>
    );
  }

  if (status === "draft") {
    return (
      <Badge
        className="border-transparent bg-yellow-100 text-yellow-800"
        variant="secondary"
      >
        {label}
      </Badge>
    );
  }

  if (status === "closed") {
    return <Badge variant="outline">{label}</Badge>;
  }

  return <Badge variant="outline">{label}</Badge>;
}
