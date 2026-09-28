"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true solo en el cliente, tras la hidratación. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
