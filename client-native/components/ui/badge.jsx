import * as React from "react";
import { View, Text } from "react-native";

export function Badge({ children, className = "", ...props }) {
  return (
    <View
      {...props}
      className={`self-start flex-row items-center px-2 py-1 rounded bg-gray-200 ${className}`}
    >
      <Text className="text-xs font-semibold text-gray-800">
        {children}
      </Text>
    </View>
  );
}