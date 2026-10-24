import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      multiline={true}
      textAlignVertical="top"
      placeholderTextColor="#a1a1aa" // zinc-400
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white",
        "focus:border-blue-500 focus:border-2",
        props.editable === false ? "opacity-50" : "",
        className
      )}
      {...props}
    />
  );
});

export { Textarea };