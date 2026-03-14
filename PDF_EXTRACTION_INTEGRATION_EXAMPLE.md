# Integration Example - Using PDF Question Generator in Teacher Dashboard

## Complete Example: TeacherTopicDetail Component

Here's how to integrate the AIQuestionGeneratorFromDatabase into an existing teacher topic detail view:

```tsx
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Database, Plus, Trash2, Eye, Download 
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";
import type { ChallengeQuestion } from "@/data/challengeTypes";

interface TeacherTopicDetailProps {
  topicId: string;
  topicName: string;
  gradeId: string;
  subjectId: string;
}

export function TeacherTopicDetail({ 
  topicId, 
  topicName, 
  gradeId, 
  subjectId 
}: TeacherTopicDetailProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  // State for existing challenges
  const [challenges, setChallenges] = useState<ChallengeQuestion[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  
  // State for AI generator
  const [showPdfGenerator, setShowPdfGenerator] = useState(false);
  const [generatingChallenges, setGeneratingChallenges] = useState(false);

  // Load existing challenges
  const loadChallenges = async () => {
    try {
      setLoadingChallenges(true);
      // Fetch challenges from your database
      const response = await fetch(
        `/api/topics/${topicId}/challenges`
      );
      const data = await response.json();
      setChallenges(data);
    } catch (error) {
      console.error("Error loading challenges:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل الأسئلة",
        variant: "destructive"
      });
    } finally {
      setLoadingChallenges(false);
    }
  };

  // Handle generated questions from AI
  const handleGenerateFromPdf = async (questions: ChallengeQuestion[]) => {
    try {
      setGeneratingChallenges(true);
      
      // Add each generated question to the database
      for (const question of questions) {
        const response = await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            gradeId,
            subjectId,
            ...question,
            createdBy: user?.id,
            source: "pdf_extracted"
          })
        });

        if (!response.ok) {
          throw new Error("فشل إضافة السؤال");
        }
      }

      // Reload challenges
      await loadChallenges();
      setShowPdfGenerator(false);

      toast({
        title: "✓ نجح",
        description: `تم إضافة ${questions.length} سؤال/لعبة من PDF بنجاح`
      });
    } catch (error: any) {
      console.error("Error adding challenges:", error);
      toast({
        title: "خطأ في الإضافة",
        description: error.message || "فشل إضافة الأسئلة إلى قاعدة البيانات",
        variant: "destructive"
      });
    } finally {
      setGeneratingChallenges(false);
    }
  };

  // Delete a challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("فشل حذف السؤال");
      }

      setChallenges(prev => prev.filter(c => c.id !== challengeId));
      toast({
        title: "تم الحذف",
        description: "تم حذف السؤال بنجاح"
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف السؤال",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{topicName}</h1>
          <p className="text-muted-foreground mt-1">
            إدارة أسئلة وألعاب الموضوع
          </p>
        </div>
        <Badge variant="outline" className="text-lg">
          {challenges.length} أسئلة
        </Badge>
      </div>

      {/* Generator Section */}
      {showPdfGenerator ? (
        <AIQuestionGeneratorFromDatabase
          teacherId={user?.id || ""}
          onGenerate={handleGenerateFromPdf}
          onCancel={() => setShowPdfGenerator(false)}
        />
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-lg">توليد أسئلة من PDF</p>
                <p className="text-sm text-muted-foreground">
                  استخدم ملفات PDF المرفوعة لتوليد أسئلة وألعاب ذكية بواسطة Gemini AI
                </p>
              </div>
              <Button
                onClick={() => setShowPdfGenerator(true)}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Database className="w-4 h-4" />
                <Sparkles className="w-4 h-4" />
                توليد من PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Add Challenge */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>إضافة سؤال يدويًا</CardTitle>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                // Open manual challenge creation dialog
              }}
            >
              <Plus className="w-4 h-4" />
              إضافة سؤال
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Challenges List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">الأسئلة والألعاب</h2>
        
        {loadingChallenges ? (
          <div className="text-center py-12 text-muted-foreground">
            جاري تحميل الأسئلة...
          </div>
        ) : challenges.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-2">لا توجد أسئلة حتى الآن</p>
              <p className="text-sm text-muted-foreground mb-4">
                ابدأ بتوليد أسئلة من PDF أو إضافة أسئلة يدويًا
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => setShowPdfGenerator(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  توليد من PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة يدويًا
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {challenges.map((challenge, index) => (
              <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {index + 1}
                          </Badge>
                          <Badge 
                            variant={
                              challenge.source === "pdf_extracted"
                                ? "default"
                                : "outline"
                            }
                          >
                            {challenge.typeTitle || challenge.type}
                          </Badge>
                          {challenge.source === "pdf_extracted" && (
                            <Badge 
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <Database className="w-3 h-3 mr-1" />
                              من PDF
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {challenge.points} نقطة
                          </Badge>
                        </div>
                        <p className="font-medium text-lg mb-2">
                          {challenge.question}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            // Show preview dialog
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteChallenge(challenge.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      </div>
                    </div>

                    {/* Options Preview */}
                    {challenge.options && challenge.options.length > 0 && (
                      <div className="pl-8 space-y-1">
                        {challenge.options.slice(0, 2).map((option, i) => (
                          <p
                            key={i}
                            className="text-sm text-muted-foreground"
                          >
                            {String.fromCharCode(97 + i)}. {option}
                          </p>
                        ))}
                        {challenge.options.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            ... و{challenge.options.length - 2} خيارات أخرى
                          </p>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {challenge.explanation && (
                      <div className="bg-blue-50 rounded p-3 mt-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          التفسير:
                        </p>
                        <p className="text-sm text-blue-800 line-clamp-2">
                          {challenge.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {challenges.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي النقاط</p>
                <p className="text-2xl font-bold">
                  {challenges.reduce((sum, c) => sum + (c.points || 100), 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">من PDF</p>
                <p className="text-2xl font-bold">
                  {challenges.filter(c => c.source === "pdf_extracted").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الوقت</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    challenges.reduce((sum, c) => sum + (c.timeLimit || 30), 0) /
                    challenges.length
                  )}
                  s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TeacherTopicDetail;
```

## Alternative: Simpler Integration

If you want a simpler button-based approach:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Database } from "lucide-react";
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";

export function QuestionGeneratorButton({ topicId, teacherId, onSuccess }) {
  const [showGenerator, setShowGenerator] = useState(false);

  if (showGenerator) {
    return (
      <AIQuestionGeneratorFromDatabase
        teacherId={teacherId}
        onGenerate={async (questions) => {
          // Save questions
          await Promise.all(
            questions.map(q =>
              fetch("/api/challenges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topicId, ...q })
              })
            )
          );
          
          onSuccess();
          setShowGenerator(false);
        }}
        onCancel={() => setShowGenerator(false)}
      />
    );
  }

  return (
    <Button
      onClick={() => setShowGenerator(true)}
      size="lg"
      className="gap-2"
    >
      <Database className="w-4 h-4" />
      <Sparkles className="w-4 h-4" />
      توليد من PDF
    </Button>
  );
}
```

## API Endpoint Example

If you need an API endpoint to save challenges:

```typescript
// /api/challenges (POST)
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        topic_id: data.topicId,
        grade_id: data.gradeId,
        subject_id: data.subjectId,
        question: data.question,
        type: data.type,
        options: data.options,
        correct_answer: data.correctAnswer,
        explanation: data.explanation,
        points: data.points,
        time_limit: data.timeLimit,
        created_by: data.createdBy,
        source: data.source || "manual",
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return NextResponse.json(challenge, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Key Points

1. **User Context**: Use `useUser()` from Clerk to get teacher ID
2. **Toast Notifications**: Use `useToast()` for user feedback
3. **Error Handling**: Wrap API calls in try-catch with user-friendly messages
4. **State Management**: Track generator visibility and loading states
5. **Database Integration**: Save generated questions to your database
6. **UI Feedback**: Show progress and success/error messages
7. **Accessibility**: Proper labeling and ARIA attributes

This integration pattern works with any React-based teacher dashboard!
