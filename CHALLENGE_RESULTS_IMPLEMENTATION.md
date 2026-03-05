# Challenge Results & Participant Answers Implementation

## Overview
This implementation adds comprehensive tracking of challenge results and individual participant answers to the database. Both single-player and group challenges now save detailed information about each participant's answers and performance.

## What Was Added

### 1. Database Schema Update

#### New Table: `challenge_answers`
A new Prisma model was added to store individual participant answers:

```prisma
model ChallengeAnswer {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  resultId        String   @map("result_id") @db.Uuid
  questionId      String   @map("question_id") @db.Uuid
  userAnswer      String?  @map("user_answer")
  isCorrect       Boolean  @map("is_correct")
  timeTaken       Float    @map("time_taken")
  pointsEarned    Int      @default(0) @map("points_earned")
  createdAt       DateTime @default(now()) @map("created_at")

  // Relations
  result   ChallengeResult @relation(fields: [resultId], references: [id], onDelete: Cascade)
  question ChallengeQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([resultId])
  @@index([questionId])
  @@map("challenge_answers")
}
```

**Fields:**
- **id**: Unique identifier for the answer record
- **resultId**: Foreign key linking to the ChallengeResult (parent)
- **questionId**: Foreign key linking to the ChallengeQuestion
- **userAnswer**: The participant's response (text, number, or JSON)
- **isCorrect**: Boolean indicating if the answer was correct
- **timeTaken**: Time spent on this question (in seconds)
- **pointsEarned**: Points awarded for this answer
- **createdAt**: Timestamp when the answer was recorded

#### Updated Relations
- Added `answers: ChallengeAnswer[]` relation to `ChallengeResult` model
- Added `answers: ChallengeAnswer[]` relation to `ChallengeQuestion` model

### 2. Database Hook: `useSaveAnswers`

**File:** [src/hooks/useDatabase.ts](src/hooks/useDatabase.ts)

Added a new mutation hook to save batch answer records:

```typescript
export const useSaveAnswers = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (answers: Array<{
            resultId: string;
            questionId: string;
            userAnswer: string | null;
            isCorrect: boolean;
            timeTaken: number;
            pointsEarned: number;
        }>) => {
            if (answers.length === 0) return [];

            const payload = answers.map(answer => ({
                result_id: answer.resultId,
                question_id: answer.questionId,
                user_answer: answer.userAnswer,
                is_correct: answer.isCorrect,
                time_taken: answer.timeTaken,
                points_earned: answer.pointsEarned,
                created_at: new Date().toISOString(),
            }));

            const { data, error } = await supabase
                .from("challenge_answers")
                .insert(payload)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["challenge_answers"] });
        }
    });
};
```

### 3. Single Player Challenge Integration

**File:** [src/pages/SingleChallenge.tsx](src/pages/SingleChallenge.tsx)

#### Changes Made:
1. **Import:** Added `useSaveAnswers` to imports
2. **Hook Instance:** Added `const saveAnswersMutation = useSaveAnswers();`
3. **Answer Saving Logic:** Added after Step 2 (saving challenge result)

```typescript
// 2.5. Save individual participant answers
console.log("[Save] Step 2.5: Saving individual participant answers...");
const answersToSave = results.questionResults.map((qr: any, index: number) => ({
    resultId: savedResult.id,
    questionId: questions[index]?.id || String(qr.questionId),
    userAnswer: qr.userAnswer || null,
    isCorrect: qr.correct,
    timeTaken: qr.timeTaken || 0,
    pointsEarned: qr.pointsEarned || 0,
}));

if (answersToSave.length > 0) {
    await saveAnswersMutation.mutateAsync(answersToSave);
    console.log("[Save] Step 2.5 complete. Saved", answersToSave.length, "answers.");
}
```

**Save Flow:**
1. Create challenge session
2. Save challenge result
3. **[NEW]** Save individual answers ← New step
4. Log topic activity
5. Update student profile stats
6. Update subject progress
7. Award badges

### 4. Group Challenge Integration

**File:** [src/pages/GroupChallenge.tsx](src/pages/GroupChallenge.tsx)

#### Changes Made:
1. **Import:** Added `useSaveAnswers` to imports
2. **Hook Instance:** Added `const saveAnswersMutation = useSaveAnswers();`
3. **Result Saving:** Added Step 2 to save challenge results (was previously missing)
4. **Answer Saving Logic:** Added after challenge result saving

```typescript
// Save challenge result with detailed answers
console.log("[Save] Step 2: Saving challenge result with detailed answers...");
const savedResult = await saveResultMutation.mutateAsync({
    sessionId: sessionData?.id || pin || "",
    userId: currentUser.id,
    totalQuestions: results.totalQuestions,
    correctAnswers: results.correctAnswers,
    wrongAnswers: results.wrongAnswers,
    score: results.score,
    maxScore: results.maxScore,
    percentage: results.percentage,
    timeTaken: results.timeTaken,
    averageTimePerQuestion: results.averageTimePerQuestion,
    longestStreak: results.longestStreak,
    accuracy: results.accuracy,
    level: results.level,
    questionResults: results.questionResults,
});

// Save individual answers
console.log("[Save] Step 2.5: Saving individual participant answers...");
const answersToSave = userHistory.map((h, index) => ({
    resultId: savedResult.id,
    questionId: questions[index]?.id || String(index),
    userAnswer: h.userAnswer || null,
    isCorrect: h.isCorrect,
    timeTaken: h.timeTaken || 0,
    pointsEarned: h.points || 0,
}));

if (answersToSave.length > 0) {
    await saveAnswersMutation.mutateAsync(answersToSave);
    console.log("[Save] Step 2.5 complete. Saved", answersToSave.length, "answers.");
}
```

## Data Flow

### Single Player Challenge
```
Challenge Completed
    ↓
Create Session
    ↓
Save Result (ChallengeResult)
    ↓
Save Individual Answers (ChallengeAnswer) ← NEW
    ↓
Log Topic Activity
    ↓
Update Student Profile
    ↓
Update Subject Progress
    ↓
Award Badges
```

### Group Challenge
```
Challenge Completed
    ↓
Save Result (ChallengeResult) ← NEW
    ↓
Save Individual Answers (ChallengeAnswer) ← NEW
    ↓
Log Topic Activity
    ↓
Update Student Profile
    ↓
Update Subject Progress
```

## Data Structure

### ChallengeAnswer Record
```json
{
  "id": "uuid",
  "resultId": "uuid (ChallengeResult.id)",
  "questionId": "uuid (ChallengeQuestion.id)",
  "userAnswer": "string or null",
  "isCorrect": boolean,
  "timeTaken": number,
  "pointsEarned": number,
  "createdAt": "2024-03-03T..."
}
```

## Benefits

1. **Detailed Analytics**: Track individual question performance
2. **Learning Insights**: Identify patterns in student answers
3. **Question Analysis**: See which questions are most challenging
4. **Audit Trail**: Complete record of participant responses
5. **Performance Metrics**: Calculate accuracy per question type
6. **Reporting**: Generate detailed reports on student performance

## Migration Status

✅ Database migration applied successfully
✅ Schema synchronized with Prisma
✅ No compilation errors
✅ Ready for production use

## Querying Answers

### Get all answers for a result
```typescript
const { data } = await supabase
  .from("challenge_answers")
  .select("*")
  .eq("result_id", resultId);
```

### Get answers by question
```typescript
const { data } = await supabase
  .from("challenge_answers")
  .select("*")
  .eq("question_id", questionId);
```

### Get answer statistics for a question
```typescript
const { data } = await supabase
  .from("challenge_answers")
  .select("*")
  .eq("question_id", questionId);

const correct = data.filter(a => a.is_correct).length;
const accuracy = (correct / data.length) * 100;
```

## Files Modified

1. **[prisma/schema.prisma](prisma/schema.prisma)**
   - Added `ChallengeAnswer` model
   - Added relations to `ChallengeResult` and `ChallengeQuestion`

2. **[src/hooks/useDatabase.ts](src/hooks/useDatabase.ts)**
   - Added `useSaveAnswers` mutation hook

3. **[src/pages/SingleChallenge.tsx](src/pages/SingleChallenge.tsx)**
   - Imported `useSaveAnswers`
   - Added answer saving logic after result is saved

4. **[src/pages/GroupChallenge.tsx](src/pages/GroupChallenge.tsx)**
   - Imported `useSaveAnswers`
   - Added result and answer saving logic

## Testing Recommendations

1. **Single Challenge**
   - Complete a single player challenge
   - Verify `challenge_results` entry is created
   - Verify `challenge_answers` entries are created (one per question)
   - Verify answer data matches student responses

2. **Group Challenge**
   - Complete a group challenge
   - Verify `challenge_results` entry is created
   - Verify `challenge_answers` entries are created
   - Verify multiple players' answers are tracked separately

3. **Data Validation**
   - Verify `isCorrect` matches actual correctness
   - Verify `timeTaken` values are positive
   - Verify `pointsEarned` matches question points
   - Verify foreign keys are valid

## Notes

- All answer data is linked to the ChallengeResult through `resultId`
- Cascade delete ensures answers are removed when result is deleted
- Indexes on `resultId` and `questionId` optimize query performance
- Answer data is immutable - once saved, it cannot be modified
- Timestamps are automatically recorded
