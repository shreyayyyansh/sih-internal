import * as React from "react";
import { View, Text } from "react-native";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full flex-row items-start rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background border-border",
        destructive: "border-destructive/50 bg-destructive/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, children, ...props }, ref) => (
  <View ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
    {children}
  </View>
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <Text ref={ref} className={cn("text-sm text-foreground leading-relaxed", className)} {...props}>
    {children}
  </Text>
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };