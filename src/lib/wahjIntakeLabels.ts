export type WahjAttendanceLevel = "full" | "partial" | "none";

export const WAHJ_ATTENDANCE_OPTIONS: Array<{ value: WahjAttendanceLevel; label: string }> = [
    { value: "full", label: "كاملة" },
    { value: "partial", label: "جزء منها" },
    { value: "none", label: "لم أحضر" },
];

export function formatWahjAttendance(level?: WahjAttendanceLevel | string | null): string {
    const match = WAHJ_ATTENDANCE_OPTIONS.find((option) => option.value === level);
    return match?.label ?? "—";
}
