

import { cn } from "~/lib/utils"
import AppLogoIcon from "../app-logo-icon"

function Loading({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <AppLogoIcon
      role="status"
      aria-label="Loading"
      className={cn("size-50 animate-spin", className)}
      {...props}
    />
  )
}

export { Loading }
