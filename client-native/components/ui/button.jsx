import * as React from "react";
import { TouchableOpacity, Text } from "react-native";

export function Button({ children, className = "", ...props }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      {...props}
      className={`px-4 py-2 bg-white/10 border border-white/20 rounded-xl items-center justify-center active:bg-white/20 ${props.disabled ? "opacity-50" : ""} ${className}`}
    >
      {typeof children === "string" ? (
        <Text className="text-white font-medium">{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}