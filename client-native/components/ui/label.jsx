import * as React from "react";
import { Text } from "react-native";
import { cn } from "@/lib/utils";

const Label = React.forwardRef(({ className, disabled, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn(
      "text-sm font-medium text-white", // Added text-white based on your dark theme
      disabled ? "opacity-70" : "",
      className
    )}
    {...props}
  />
));

Label.displayName = "Label";

export { Label };