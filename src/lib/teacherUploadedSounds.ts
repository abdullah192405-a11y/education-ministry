export type TeacherSoundCategory = "correct" | "wrong" | "background";

export type TeacherUploadedSoundRow = {
    id: string;
    teacher_id: string;
    sound_category: TeacherSoundCategory;
    url: string;
    label?: string | null;
    storage_path?: string | null;
    created_at?: string;
};

export type SoundOption = { label: string; url: string };

export function teacherSoundsToOptions(
    rows: TeacherUploadedSoundRow[],
    fallbackLabel: string
): SoundOption[] {
    const seen = new Set<string>();
    return rows
        .map((row) => ({
            label: row.label?.trim() || fallbackLabel,
            url: row.url.trim(),
        }))
        .filter((opt) => {
            if (!opt.url || seen.has(opt.url)) return false;
            seen.add(opt.url);
            return true;
        });
}

export function mergeSoundOptionLists(...lists: SoundOption[][]): SoundOption[] {
    const seen = new Set<string>();
    const merged: SoundOption[] = [];
    for (const list of lists) {
        for (const opt of list) {
            const url = opt.url?.trim();
            if (!url || seen.has(url)) continue;
            seen.add(url);
            merged.push({ label: opt.label || "", url });
        }
    }
    return merged;
}

export function optionFromTopicUrl(url?: string | null, savedLabel?: string): SoundOption[] {
    const trimmed = url?.trim();
    if (!trimmed) return [];
    return [{ label: savedLabel || "", url: trimmed }];
}
