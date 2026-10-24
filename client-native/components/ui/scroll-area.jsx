import * as React from "react";
import { ScrollView } from "react-native";

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <ScrollView
    ref={ref}
    showsVerticalScrollIndicator={false}
    className={`flex-1 ${className || ""}`}
    {...props}
  >
    {children}
  </ScrollView>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };