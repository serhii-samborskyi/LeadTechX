import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RingPortMobile from "./app";
import { initializeNotifications } from "./src/notifications";

export default function Root() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RingPortMobile />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
