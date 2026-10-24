import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input(
  { className, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#a1a1aa" // zinc-400
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-white",
        "focus:border-blue-500 focus:border-2", // Adapted focus state for mobile
        props.editable === false ? "opacity-50" : "", // Handle disabled state via opacity
        className
      )}
      {...props}
    />
  );
});

export { Input };