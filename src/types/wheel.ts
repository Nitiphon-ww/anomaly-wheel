export type Prize = {
  id: string;
  label: string;
  color: string;
  textColor: string;
  probabilityWeight: number;
};
export type SpinState = "idle" | "spinning" | "result";
export type SpinPlan = {
  startAngle: number;
  targetAngle: number;
  duration: number;
  segmentCount: number;
};
