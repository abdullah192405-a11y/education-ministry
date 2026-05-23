/** Normalize a challenge_results / player_sessions row to a 0–100 percentage for dashboards. */
export function getChallengeResultScorePercent(row: any): number {
    if (!row) return 0;

    const percentage = Number(row.percentage);
    if (Number.isFinite(percentage)) {
        return Math.max(0, Math.min(100, Math.round(percentage)));
    }

    const correct = Number(row.correct_answers ?? row.correctAnswers ?? 0);
    const wrong = Number(row.wrong_answers ?? row.wrongAnswers ?? 0);
    const answered = correct + wrong;
    if (answered > 0) {
        return Math.max(0, Math.min(100, Math.round((correct / answered) * 100)));
    }

    const score = Number(row.score);
    const maxScore = Number(row.max_score ?? row.maxScore);
    if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
        return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
    }

    if (Number.isFinite(score)) {
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    return 0;
}

export function averageChallengeResultScorePercent(rows: any[]): number {
    if (!rows?.length) return 0;
    const sum = rows.reduce((acc, row) => acc + getChallengeResultScorePercent(row), 0);
    return Math.round(sum / rows.length);
}
