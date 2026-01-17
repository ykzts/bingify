import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
