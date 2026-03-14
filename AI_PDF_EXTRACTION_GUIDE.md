# AI Question Generator with PDF Extraction from Database

## Overview

This system enables teachers to upload PDF files and then use them as source material for generating AI-powered questions and games. The pipeline extracts text from PDFs stored in the database and passes the content to Gemini AI for intelligent question generation.

## Architecture

```
Teacher Uploads PDF → Stored in Supabase Storage
        ↓
Teacher Selects PDF for Question Generation
        ↓
System Fetches PDF from Database (getTeacherPdfs)
        ↓
Extracts Text from PDF (extractPdfFromSupabase)
        ↓
Sends Extracted Content + Instructions to Gemini API
        ↓
AI Generates Questions & Games
        ↓
Questions Added to Challenge Bank
```

## Components

### 1. **AIQuestionGeneratorFromDatabase.tsx**
Main component for generating questions from teacher's uploaded PDF files.

#### Features:
- Lists all available PDF files for the teacher
- Multi-select PDF files
- Extracts text from selected PDFs
- Allows custom instructions for question generation
- Supports 3 generation modes:
  - Questions only
  - Games only
  - Both questions and games

#### Usage:
```tsx
import AIQuestionGeneratorFromDatabase from "@/pages/dashboard/teacher/components/AIQuestionGeneratorFromDatabase";

<AIQuestionGeneratorFromDatabase
  teacherId={currentTeacherId}
  onGenerate={(questions) => {
    // Add generated questions to challenge bank
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

#### Key Props:
- `teacherId`: Current teacher's ID
- `onGenerate`: Callback when questions are generated
- `onCancel`: Callback when user cancels

### 2. **pdfExtractor.ts** - PDF Extraction Utilities

Located at: `/src/lib/pdfExtractor.ts`

#### Available Functions:

##### `extractPdfText(source: File | string): Promise<string>`
Extracts text from a PDF file or URL.

```typescript
// From File
const file = new File([...], "document.pdf", { type: "application/pdf" });
const text = await extractPdfText(file);

// From URL
const text = await extractPdfText("https://example.com/document.pdf");
```

##### `extractPdfFromSupabase(teacherId: string, fileName: string): Promise<string>`
Fetches a PDF from Supabase Storage and extracts its text content.

```typescript
const content = await extractPdfFromSupabase(
  "teacher-123",
  "chapter1.pdf"
);
console.log(content); // Extracted text
```

##### `getTeacherPdfs(teacherId: string): Promise<PdfFile[]>`
Lists all PDF files uploaded by a teacher.

```typescript
const pdfs = await getTeacherPdfs("teacher-123");
// Returns: [
//   {
//     name: "chapter1.pdf",
//     size: 2048576,
//     uploadedAt: "2024-01-15"
//   },
//   ...
// ]
```

##### `extractMultiplePdfs(pdfFiles: PdfFile[]): Promise<Map<string, string>>`
Batch extraction of multiple PDFs, returning extracted content mapped by filename.

```typescript
const pdfs = await getTeacherPdfs(teacherId);
const contentMap = await extractMultiplePdfs(pdfs);

contentMap.forEach((content, fileName) => {
  console.log(`${fileName}: ${content.substring(0, 100)}...`);
});
```

## Database Integration

### Supabase Storage Structure
```
teacher-content/
├── teacher-id-1/
│   └── content/
│       ├── chapter1.pdf
│       ├── chapter2.pdf
│       └── reference.pdf
├── teacher-id-2/
│   └── content/
│       └── biology101.pdf
```

### PDF File Storage
- **Bucket**: `teacher-content`
- **Path Format**: `{teacher-id}/content/{filename}`
- **Access**: Public read-only (via generated URLs)
- **Max File Size**: 50MB per file

## Generation Pipeline

### Step 1: Load Available PDFs
When the component mounts, it fetches all PDF files for the teacher:
```typescript
const pdfs = await getTeacherPdfs(teacherId);
```

### Step 2: User Selects PDFs
Teacher can select one or multiple PDF files from the list.

### Step 3: Set Generation Instructions
Teacher provides specific instructions, e.g.:
- "Generate 5 multiple choice questions about Chapter 1"
- "Create matching games for vocabulary terms"
- "Generate both questions and interactive games"

### Step 4: Extract Content
For each selected PDF:
```typescript
const content = await extractPdfFromSupabase(teacherId, pdfName);
```

### Step 5: Send to Gemini API
Combined extracted content + instructions sent to Gemini AI:
```typescript
const prompt = `
محتوى PDF:
${combinedContent}

التعليمات:
${userInstructions}

توليد: ${generationType}
`;
```

### Step 6: Parse Response
AI response parsed for:
- `questions`: Array of question objects
- `games`: Array of game objects

### Step 7: Create Challenge Questions
Generated objects converted to `ChallengeQuestion` type with metadata.

## Response Format

The Gemini API should return JSON with this structure:

```json
{
  "questions": [
    {
      "question": "What is the main topic?",
      "type": "multiple_choice",
      "typeTitle": "اختيار من متعدد",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Explanation of why this is correct",
      "points": 100,
      "timeLimit": 30
    }
  ],
  "games": [
    {
      "question": "Match the terms with definitions",
      "type": "matching",
      "typeTitle": "تطابق",
      "pairs": [
        { "term": "Term 1", "definition": "Definition 1" },
        { "term": "Term 2", "definition": "Definition 2" }
      ],
      "points": 150,
      "timeLimit": 60
    }
  ]
}
```

## Supported Question Types

### Questions
- `multiple_choice`: Multiple choice with 4 options
- `true_false`: True/False questions
- `short_answer`: Short text answers

### Games
- `matching`: Match terms with definitions
- `ordering`: Order items in sequence
- `wheel`: Spinning wheel game
- `interactive`: Other interactive games

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "لا توجد ملفات PDF" | Teacher hasn't uploaded PDFs | Direct to ContentUploadTab |
| "فشل استخراج محتوى PDF" | PDF extraction failed | Check PDF format, file not corrupted |
| "لم يتم الحصول على نتيجة من AI" | Gemini API issue | Check API key, quota limits |
| "فشل استخراج JSON" | Response format incorrect | Verify Gemini API response format |

## Usage Example

### In Teacher Dashboard

```tsx
// In TeacherTopicDetail.tsx or similar
const [showGenerator, setShowGenerator] = useState(false);

return (
  <div>
    {showGenerator ? (
      <AIQuestionGeneratorFromDatabase
        teacherId={user.id}
        onGenerate={(questions) => {
          // Add to challenge bank
          questions.forEach(q => {
            createChallenge({
              topicId: currentTopicId,
              ...q
            });
          });
          setShowGenerator(false);
          toast.success("تم إضافة الأسئلة بنجاح");
        }}
        onCancel={() => setShowGenerator(false)}
      />
    ) : (
      <Button onClick={() => setShowGenerator(true)}>
        توليد من PDF
      </Button>
    )}
  </div>
);
```

## Best Practices

1. **Clear Instructions**: Provide specific, detailed instructions for question generation
2. **PDF Quality**: Use clean, well-formatted PDFs for better text extraction
3. **Content Relevance**: Ensure PDF content matches the topic
4. **Multiple PDFs**: Combine related PDFs for comprehensive question generation
5. **Review Generated**: Always review AI-generated questions before publishing
6. **Test Content**: Test generated games for clarity and correctness

## Configuration

### Environment Variables Required
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Dependencies
```json
{
  "pdfjs-dist": "^3.x.x",
  "@google/generative-ai": "^0.x.x",
  "framer-motion": "^10.x.x"
}
```

## Performance Considerations

- **Extraction Time**: ~1-2 seconds per PDF (depending on size)
- **Generation Time**: ~10-30 seconds for Gemini API response
- **Batch Processing**: Extracting 5 PDFs takes ~5-10 seconds
- **Caching**: Consider caching extracted content for frequently used PDFs

## Troubleshooting

### PDF Won't Extract
1. Check file format is valid PDF
2. Verify file size < 50MB
3. Try uploading again from ContentUploadTab

### No Questions Generated
1. Verify PDF has readable text (not image-based)
2. Check Gemini API key is valid
3. Ensure instructions are clear and specific
4. Try with simpler instructions first

### Slow Performance
1. Use PDFs < 10MB for faster extraction
2. Extract 1-3 PDFs at a time
3. Check network connection
4. Monitor Gemini API quota usage

## Future Enhancements

- [ ] Cache extracted PDF content
- [ ] Support for other document formats (DOCX, PPTX)
- [ ] Batch generation for multiple topics
- [ ] Question difficulty level configuration
- [ ] Student feedback loop for question quality
- [ ] Integration with existing question banks
- [ ] Advanced prompt templates for different subjects
- [ ] Multi-language support for PDF content
