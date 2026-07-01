import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";

let bootstrapped = false;

export function bootstrapRuntimeConsumer(): { bootstrapped: boolean; timestamp: string } {
  if (!bootstrapped) {
    ensurePmfreakAocAdaptersRegistered();
    bootstrapped = true;
  }
  return { bootstrapped: true, timestamp: new Date().toISOString() };
}
