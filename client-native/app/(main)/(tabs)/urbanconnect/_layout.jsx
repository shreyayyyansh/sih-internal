import { Stack } from 'expo-router';

export default function UrbanConnectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="post/[id]" />
    </Stack>
  );
}
