/** Time-of-day greeting for the dashboard welcome line. Pure, so it can be tested; the hour comes from the user's own device. */

export function dayPart(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hello";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export const greeting = (name: string, hour: number) => `${dayPart(hour)}, ${firstName(name)}`;
