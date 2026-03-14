# PDF Database Integration - Quick Setup

## Quick Summary

You now have a complete PDF extraction and question generation system:

1. ✅ **ContentUploadTab** - Teachers upload PDFs and files
2. ✅ **pdfExtractor.ts** - Utility functions for database PDF extraction
3. ✅ **AIQuestionGeneratorFromDatabase** - AI-powered question generator using database PDFs

## How It Works (3 Steps)

### Step 1: Teacher Uploads PDF
In ContentUploadTab component, teacher uploads PDF files:
- Files are stored in Supabase Storage at: `teacher-content/{teacher-id}/content/{filename}`
- Files are listed in the content management interface

### Step 2: Teacher Initiates Question Generation
Click "توليد من PDF" button to open AIQuestionGeneratorFromDatabase:
- System automatically loads all teacher's uploaded PDFs
- Teacher selects which PDFs to use
- Teacher provides generation instructions

### Step 3: System Generates Questions
The pipeline:
```
1. Fetch PDFs from Supabase Storage (getTeacherPdfs)
   ↓
2. Extract text from selected PDFs (extractPdfFromSupabase)
   ↓
3. Send extracted content + instructions to Gemini AI
   ↓
4. AI generates questions and games
   ↓
5. Questions added to challenge bank
```

## Integration in Dashboard

To integrate AIQuestionGeneratorFromDatabase in your teacher dashboard:

```tsx
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";

// In your topic/subject view:
const [showPdfGenerator, setShowPdfGenerator] = useState(false);

return (
  <div>
    {showPdfGenerator && (
      <AIQuestionGeneratorFromDatabase
        teacherId={currentUser.id}
        onGenerate={async (questions) => {
          // Add questions to your challenge bank
          for (const q of questions) {
            await createChallenge({
              topicId: currentTopicId,
              ...q
            });
          }
          setShowPdfGenerator(false);
          toast.success("✓ تم إضافة الأسئلة بنجاح");
        }}
        onCancel={() => setShowPdfGenerator(false)}
      />
    )}
    
    <Button 
      onClick={() => setShowPdfGenerator(true)}
      className="gap-2"
    >
      <Sparkles className="w-4 h-4" />
      توليد من PDF
    </Button>
  </div>
);
```

## Key Features

### PDF Selection
- Multi-select support
- Shows file size and upload date
- Only shows PDFs for current teacher
- Auto-selects first PDF

### Generation Types
- 📝 **Questions Only**: Multiple choice, true/false, short answer
- 🎮 **Games Only**: Matching, ordering, wheel games
- 🎯 **Both**: Full mix of questions and interactive games

### Processing Phases
- **Extracting**: Fetches PDFs from database
- **Analyzing**: Reads PDF content
- **Generating**: AI creates questions/games

### Error Handling
- Automatic error messages in Arabic
- User guidance for missing PDFs
- Graceful fallback options

## File Locations

```
src/
├── lib/
│   └── pdfExtractor.ts          ← Core extraction utilities
├── pages/dashboard/teacher/
│   └── components/
│       ├── ContentUploadTab.tsx  ← Upload interface
│       └── AIQuestionGeneratorFromDatabase.tsx  ← Generation interface
└── data/
    └── challengeTypes.ts        ← Question type definitions
```

## Available Functions

### From `pdfExtractor.ts`

#### Extract from File
```typescript
const content = await extractPdfText(file);
```

#### Extract from Supabase
```typescript
const content = await extractPdfFromSupabase(teacherId, fileName);
```

#### List Teacher's PDFs
```typescript
const pdfs = await getTeacherPdfs(teacherId);
// Returns: PdfFile[] with name, size, uploadedAt
```

#### Batch Extract
```typescript
const contentMap = await extractMultiplePdfs(pdfFiles);
// Returns: Map<fileName, extractedText>
```

## Configuration Needed

### Environment Variables
```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
No additional setup needed! Uses existing:
- Supabase Storage bucket: `teacher-content`
- Teacher authentication via Clerk
- Public read-only access to PDFs

## Usage Example in Context

```tsx
// In TeacherTopicDetail.tsx
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";

export function TeacherTopicDetail() {
  const { user } = useUser();
  const [showGenerator, setShowGenerator] = useState(false);
  const { createChallenge } = useDatabase();

  if (showGenerator) {
    return (
      <AIQuestionGeneratorFromDatabase
        teacherId={user.id}
        onGenerate={async (questions) => {
          // Add each generated question
          for (const q of questions) {
            await createChallenge({
              topicId: currentTopicId,
              question: q.question,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              // ... other fields
            });
          }
          setShowGenerator(false);
        }}
        onCancel={() => setShowGenerator(false)}
      />
    );
  }

  return (
    <div>
      <Button 
        onClick={() => setShowGenerator(true)}
        variant="outline"
        className="gap-2"
      >
        <Database className="w-4 h-4" />
        توليد من PDF
      </Button>
    </div>
  );
}
```

## Workflow Diagram

```
Teacher Dashboard
    ↓
[Upload Content Tab] → PDFs stored in Supabase Storage
    ↓
[Topic/Subject View]
    ↓
[Generator Button]
    ↓
AIQuestionGeneratorFromDatabase
    ├─→ Load PDFs (getTeacherPdfs)
    ├─→ Select PDFs
    ├─→ Write Instructions
    ├─→ Extract Content (extractPdfFromSupabase)
    ├─→ Send to Gemini AI
    └─→ Generate Questions/Games
         ↓
    Create Challenges in Database
         ↓
    Display in Student Challenge View
```

## Performance Tips

1. **Keep PDFs < 10MB** for faster extraction (typically 1-2 seconds per PDF)
2. **Use 3-5 PDFs max** in one generation (10-15 seconds total)
3. **Clear, specific instructions** = better quality output
4. **One topic at a time** for focused questions

## What's Next?

1. ✅ Create `AIQuestionGeneratorFromDatabase.tsx` component
2. ✅ Create `pdfExtractor.ts` utility library
3. ⏳ Integrate button in teacher dashboard components
4. ⏳ Test with real PDF files
5. ⏳ Customize Gemini prompts for your subjects
6. ⏳ Add question review/edit interface before publishing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No PDFs found" | Upload PDFs in ContentUploadTab first |
| "PDF extraction failed" | Ensure PDF is text-based, not scanned image |
| "AI generation timeout" | Try with fewer PDFs or simpler instructions |
| "No questions generated" | Check Gemini API key and quota |
| "Questions not appearing" | Verify questions were added to correct topic |

## Support Resources

- [Full PDF Extraction Guide](./AI_PDF_EXTRACTION_GUIDE.md)
- [Content Upload Documentation](./CONTENT_UPLOAD_DOCUMENTATION.md)
- [Challenge Type Definitions](./src/data/challengeTypes.ts)
- [Gemini API Documentation](https://ai.google.dev)
