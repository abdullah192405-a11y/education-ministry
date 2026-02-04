# 🚀 Quick Start - AI Question Generator

## Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Gemini API Key
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### 3. Create .env File
Create `.env` in project root:
```bash
VITE_GEMINI_API_KEY=paste_your_key_here
```

### 4. Start Development Server
```bash
npm run dev
```

## Usage

### Access the Feature:
```
/dashboard/teacher → الدروس → Edit Topic → الأسئلة والألعاب → توليد بالذكاء الاصطناعي
```

### Steps:
1. **Upload PDF** - Choose your educational PDF file
2. **Write Prompt** - Tell AI what you want:
   ```
   Example: "Generate 10 multiple choice questions about Unit 1"
   ```
3. **Click Generate** - Wait 5-15 seconds
4. **Review & Edit** - Check generated questions
5. **Save** - Questions are ready to use!

## Example Prompts

### Good Prompts ✅
- "ولّد 10 أسئلة اختيار متعدد عن الوحدة الأولى: الخلية"
- "5 ألعاب مطابقة و 5 أسئلة صح وخطأ عن الحروف الأبجدية"
- "أسئلة صعبة (150-200 نقطة) عن الدرس الثالث"

### Bad Prompts ❌
- "أسئلة" (too vague)
- "درس" (not specific)
- "شيء" (unclear)

## Supported Question Types

### Questions (أسئلة):
- ✅ Multiple Choice (اختيار متعدد)
- ✅ True/False (صح وخطأ)
- ✅ Q&A (سؤال وجواب)
- ✅ Know/Don't Know (أعرف/لا أعرف)
- ✅ Order (ترتيب)

### Games (ألعاب):
- ✅ Matching (مطابقة)
- ✅ Shooting (تصويب)
- ✅ Wheel Spin (عجلة الحظ)
- ✅ Puzzle (ألغاز)

## Troubleshooting

### "API Key not configured"
- Check `.env` file exists
- Verify `VITE_GEMINI_API_KEY=...` is set
- Restart `npm run dev`

### "Error 401"
- API key is wrong/expired
- Get new key from Google AI Studio

### "No content generated"
- Prompt too vague - be more specific
- PDF might be empty/corrupted
- Try different PDF

## Features

✅ **PDF Reading** - Extracts text from any PDF  
✅ **Smart Generation** - AI understands context  
✅ **Multiple Types** - Questions + Games  
✅ **Customizable** - Edit after generation  
✅ **Arabic Support** - Full RTL support  
✅ **Fast** - Results in ~10 seconds  

## API Limits (Free Tier)

- **60 requests/minute**
- **1500 requests/day**

Plenty for normal use!

## What's Next?

See `AI_QUESTION_GENERATOR_GUIDE.md` for:
- Detailed documentation
- Advanced usage
- Best practices
- Architecture details

---

**Happy Teaching! 🎓✨**
