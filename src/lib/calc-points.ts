import { clampNumber } from "./format";

export type PointsInputs = { points: number; cpp: number; };
export type PointsOutputs = { value: number; low: number; high: number; };

export function calcPoints(inputs: PointsInputs): PointsOutputs {
  const points = clampNumber(inputs.points, 0, 1e12);
  const cpp = clampNumber(inputs.cpp, 0, 10); // cents per point
  const value = points * (cpp / 100);
  const low = points * 0.008;
  const high = points * 0.015;
  return { value, low, high };
}
