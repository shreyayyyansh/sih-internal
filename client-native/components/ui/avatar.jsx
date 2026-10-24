import * as React from "react";
import { View, Image, Text } from "react-native";

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ""}`}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef(({ className, source, ...props }, ref) => (
  <Image
    ref={ref}
    source={source} 
    className={`aspect-square h-full w-full ${className || ""}`}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef(({ className, children, ...props }, ref) => (
  <View
    ref={ref}
    className={`flex h-full w-full items-center justify-center rounded-full bg-zinc-800 ${className || ""}`}
    {...props}
  >
    <Text className="text-zinc-400 font-medium">{children}</Text>
  </View>
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };