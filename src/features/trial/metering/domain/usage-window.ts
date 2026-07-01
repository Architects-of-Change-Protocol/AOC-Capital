import type { OperationalConsumptionWindow } from './metering-types';

export type OperationalWindowState = {
  activeWindow: OperationalConsumptionWindow;
  expiresSoon: boolean;
  expired: boolean;
};

export const resolveOperationalWindowState = (window: OperationalConsumptionWindow, nowIso: string): OperationalWindowState => {
  const now = Date.parse(nowIso);
  const end = Date.parse(window.endsAt);
  const start = Date.parse(window.startsAt);
  return {
    activeWindow: window,
    expired: now >= end,
    expiresSoon: now >= start && now < end && end - now <= 1000 * 60 * 60 * 24,
  };
};
