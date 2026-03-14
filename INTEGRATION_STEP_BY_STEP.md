# Step-by-Step Integration Guide

## Where to Add the PDF Generator

This guide shows exactly where and how to integrate the PDF Question Generator into your existing teacher dashboard components.

## Option 1: In Teacher Topic View

### Find Your Topic Component
Look for a file like: `TeacherTopicView.tsx` or `TopicDetailPage.tsx` in:
```
src/pages/dashboard/teacher/...
```

### Add Import
```tsx
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";
```

### Add State
```tsx
const [showPdfGenerator, setShowPdfGenerator] = useState(false);
```

### Replace or Add Section

**OLD CODE (what you might have):**
```tsx
<div className="space-y-4">
  <h2>موضوع: {topic.name}</h2>
  {/* Topic content */}
</div>
```

**NEW CODE (add this):**
```tsx
<div className="space-y-4">
  <h2>موضوع: {topic.name}</h2>
  
  {/* PDF Generator Section */}
  {showPdfGenerator ? (
    <AIQuestionGeneratorFromDatabase
      teacherId={user.id}
      onGenerate={async (questions) => {
        // Save to database
        for (const q of questions) {
          await createChallenge({
            topicId: topic.id,
            ...q
          });
        }
        toast.success(`تم إضافة ${questions.length} سؤال`);
        setShowPdfGenerator(false);
      }}
      onCancel={() => setShowPdfGenerator(false)}
    />
  ) : (
    <Button 
      onClick={() => setShowPdfGenerator(true)}
      className="gap-2"
    >
      <Database className="w-4 h-4" />
      توليد من PDF
    </Button>
  )}
  
  {/* Topic content */}
</div>
```

## Option 2: In Teacher Subject View

### Find Your Subject Component
Look for a file like: `TeacherSubjectView.tsx` or similar.

### Same Integration Pattern
```tsx
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";

export function TeacherSubjectView({ subject, grade }) {
  const [showPdfGenerator, setShowPdfGenerator] = useState(false);
  
  return (
    <div className="space-y-6">
      <h1>{subject.name}</h1>
      
      {/* Generator Toggle */}
      {!showPdfGenerator && (
        <Button 
          onClick={() => setShowPdfGenerator(true)}
          size="lg"
          className="gap-2"
        >
          <Database className="w-5 h-5" />
          توليد أسئلة من PDF
        </Button>
      )}
      
      {/* Generator Component */}
      {showPdfGenerator && (
        <AIQuestionGeneratorFromDatabase
          teacherId={user.id}
          onGenerate={handleQuestionsGenerated}
          onCancel={() => setShowPdfGenerator(false)}
        />
      )}
      
      {/* Rest of your component */}
    </div>
  );
}
```

## Option 3: In Challenges/Questions Tab

### Find Your Challenges List Component
```
src/pages/dashboard/teacher/components/ChallengesTab.tsx
```

### Add as Secondary Action
```tsx
export function ChallengesTab({ topicId, gradeId, subjectId }) {
  const [showPdfGenerator, setShowPdfGenerator] = useState(false);
  const [challenges, setChallenges] = useState([]);
  
  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={() => setShowPdfGenerator(true)}
          variant="default"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          توليد من PDF
        </Button>
        <Button 
          onClick={() => setShowManualEditor(true)}
          variant="outline"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة يدويًا
        </Button>
      </div>
      
      {/* PDF Generator */}
      {showPdfGenerator && (
        <AIQuestionGeneratorFromDatabase
          teacherId={user.id}
          onGenerate={async (questions) => {
            const savedQuestions = await Promise.all(
              questions.map(q => createChallenge({ topicId, gradeId, subjectId, ...q }))
            );
            setChallenges([...challenges, ...savedQuestions]);
            setShowPdfGenerator(false);
          }}
          onCancel={() => setShowPdfGenerator(false)}
        />
      )}
      
      {/* Challenges List */}
      <div className="space-y-2">
        {challenges.map(c => (
          <ChallengeCard key={c.id} challenge={c} />
        ))}
      </div>
    </div>
  );
}
```

## Complete Working Example

Here's a complete, copy-paste ready component:

```tsx
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";
import { useDatabase } from "@/hooks/useDatabase";

export function TeacherQuestionsSection({ topicId, subjectId, gradeId }) {
  const { user } = useUser();
  const { toast } = useToast();
  const { createChallenge } = useDatabase();
  
  const [showGenerator, setShowGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQuestions = async (questions: any[]) => {
    try {
      setIsLoading(true);
      
      // Save each question
      let saved = 0;
      for (const question of questions) {
        try {
          await createChallenge({
            topicId,
            subjectId,
            gradeId,
            question: question.question,
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            points: question.points || 100,
            timeLimit: question.timeLimit || 30,
            source: "pdf_extracted"
          });
          saved++;
        } catch (error) {
          console.error("Failed to save question:", error);
        }
      }
      
      toast({
        title: "✓ تم التوليد والحفظ",
        description: `تم حفظ ${saved}/${questions.length} سؤال بنجاح`
      });
      
      setShowGenerator(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل حفظ الأسئلة",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showGenerator) {
    return (
      <AIQuestionGeneratorFromDatabase
        teacherId={user?.id || ""}
        onGenerate={handleGenerateQuestions}
        onCancel={() => setShowGenerator(false)}
      />
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">توليد أسئلة ذكية</h3>
            <p className="text-sm text-muted-foreground">
              استخدم ملفات PDF المرفوعة لتوليد أسئلة بواسطة الذكاء الاصطناعي
            </p>
          </div>
          <Button
            onClick={() => setShowGenerator(true)}
            disabled={isLoading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Database className="w-4 h-4" />
            <Sparkles className="w-4 h-4" />
            توليد من PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Minimal Integration (3 lines)

If you want the absolute minimum:

```tsx
// 1. Import
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";

// 2. Use it
<AIQuestionGeneratorFromDatabase teacherId={user.id} onGenerate={saveQuestions} onCancel={close} />
```

## Checklist for Integration

- [ ] Imported the component
- [ ] Added state for showing/hiding generator
- [ ] Added button to trigger generator
- [ ] Imported necessary types and hooks
- [ ] Created `handleGenerateQuestions` callback
- [ ] Implemented database save logic
- [ ] Added error handling with toast
- [ ] Tested with sample PDF

## Common Integration Points

### In Dashboard Sidebar/Navigation
```tsx
<NavLink 
  to="/teacher/pdf-generator" 
  icon={<Database />}
>
  توليد من PDF
</NavLink>
```

### In Topic Card
```tsx
<Card>
  <CardHeader>{topic.name}</CardHeader>
  <CardContent>
    <Button onClick={() => showGenerator()}>
      توليد أسئلة
    </Button>
  </CardContent>
</Card>
```

### In Content Tab
```tsx
export enum TeacherTabs {
  Content = "content",
  Questions = "questions",
  PdfGenerator = "pdf_generator"  // NEW
}
```

## Next: Integration Verification

After integration, verify by:

1. ✅ Component renders without errors
2. ✅ Can select PDF files from your uploads
3. ✅ Can write generation instructions
4. ✅ Generation button is clickable
5. ✅ Processing shows progress
6. ✅ Questions are generated
7. ✅ Callback is triggered
8. ✅ Questions appear in database

## Troubleshooting Integration Issues

| Issue | Solution |
|-------|----------|
| "Module not found" | Check import path matches your structure |
| "Component not rendering" | Verify state is being set correctly |
| "No PDFs showing" | Ensure ContentUploadTab has uploaded PDFs |
| "Callback not firing" | Check onGenerate prop is passed correctly |
| "TypeScript errors" | Install @types for required packages |

## Getting User ID

Different authentication systems:

```tsx
// With Clerk
import { useUser } from "@clerk/clerk-react";
const { user } = useUser();
const teacherId = user?.id;

// With Auth0
import { useAuth0 } from "@auth0/auth0-react";
const { user } = useAuth0();
const teacherId = user?.sub;

// With Supabase
import { useSessionContext } from "@supabase/auth-helpers-react";
const { session } = useSessionContext();
const teacherId = session?.user.id;
```

## Database Save Pattern

Choose the pattern that matches your database:

```tsx
// Option 1: Direct Supabase
const { data } = await supabase
  .from("challenges")
  .insert({ topicId, ...question });

// Option 2: API Route
const response = await fetch("/api/challenges", {
  method: "POST",
  body: JSON.stringify({ topicId, ...question })
});

// Option 3: React Query
const { mutate: createChallenge } = useMutation(
  (data) => api.post("/challenges", data)
);
createChallenge({ topicId, ...question });

// Option 4: Custom Hook
const { createChallenge } = useDatabase();
await createChallenge({ topicId, ...question });
```

---

**Choose the option that best fits your existing code structure and follow the pattern!**
