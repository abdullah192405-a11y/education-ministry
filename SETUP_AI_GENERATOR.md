# 🚀 حل المشاكل - تشغيل AI Generator

## ✅ تم إصلاح مشكلة pdfjs!

### المشكلة:
```
UnknownErrorException: The API version "5.4.624" does not match 
the Worker version "3.11.174"
```

### الحل:
✅ تم تحديث الكود ليستخدم نسخة المكتبة الفعلية تلقائياً

---

## ⚙️ الخطوات للتشغيل:

### 1️⃣ الحصول على Gemini API Key

1. **اذهب إلى**: https://makersuite.google.com/app/apikey
   
2. **سجل الدخول** بحساب Google

3. **اضغط "Create API Key"** أو "Get API Key"

4. **انسخ المفتاح** (يبدأ بـ `AIza...`)

---

### 2️⃣ إنشاء ملف .env

في مجلد المشروع (نفس مكان `package.json`):

**طريقة 1: من VS Code**
```
1. New File → .env
2. أضف:
   VITE_GEMINI_API_KEY=AIzaSy...paste_your_key_here
3. Save (Ctrl+S)
```

**طريقة 2: من Terminal**
```powershell
# في PowerShell
echo "VITE_GEMINI_API_KEY=AIzaSy...your_key_here" > .env
```

**⚠️ مهم جداً:**
- الملف اسمه `.env` فقط (بدون .example)
- في نفس مجلد `package.json`
- لا مسافات حول `=`

---

### 3️⃣ إعادة تشغيل السيرفر

```bash
# أوقف السيرفر الحالي (Ctrl+C)
# ثم شغّل من جديد:
npm run dev
```

⚡ **يجب إعادة التشغيل** بعد إنشاء `.env`!

---

### 4️⃣ التحقق

في المتصفح، Console:
```javascript
// افتح Console (F12)
// اكتب:
console.log(import.meta.env.VITE_GEMINI_API_KEY)

// يجب أن يظهر المفتاح (إذا لم يظهر = المشكلة في .env)
```

---

## 🎯 الآن جرّب:

1. **افتح المتصفح**: http://localhost:5173

2. **انتقل إلى**:
   ```
   Dashboard → Teacher → الدروس → Edit Topic → 
   الأسئلة والألعاب → توليد بالذكاء الاصطناعي
   ```

3. **اكتب prompt**:
   ```
   ولّد 5 أسئلة اختيار متعدد عن الخلية النباتية
   ```

4. **اضغط "توليد"** ✨

---

## 🐛 إذا لم يعمل:

### خطأ: "لم يتم تكوين مفتاح Gemini API"

**الحل:**
```bash
# 1. تأكد أن الملف اسمه .env (بالضبط)
dir .env  # في PowerShell
ls .env   # في bash

# 2. تأكد من المحتوى
cat .env

# يجب أن يظهر:
# VITE_GEMINI_API_KEY=AIzaSy...

# 3. أعد التشغيل
npm run dev
```

### خطأ: pdfjs version mismatch

**الحل:**
```bash
# حذف node_modules وإعادة التثبيت
rm -r node_modules
npm install
npm run dev
```

### خطأ: API 401 Unauthorized

**الحل:**
- المفتاح خطأ أو منتهي
- جرب مفتاح جديد من Google AI Studio

---

## ✅ Checklist:

- [ ] حصلت على Gemini API Key
- [ ] أنشأت ملف `.env` في الJذر الصحيح
- [ ] أضفت `VITE_GEMINI_API_KEY=...`
- [ ] أعدت تشغيل `npm run dev`
- [ ] تحققت من Console (F12)

إذا كلها ✓ → **يجب أن يعمل الآن!** 🎉

---

## 💡 Tip:

**للاختبار السريع بدون PDF:**
```
Prompt: "ولّد 3 أسئلة اختيار متعدد بسيطة عن الحروف العربية"
```

سيعمل مباشرة بدون الحاجة لرفع PDF!

---

## 📞 المساعدة:

إذا استمرت المشكلة، أرسل:
1. محتوى `.env` (بدون المفتاح!)
2. نص الخطأ كاملاً من Console
3. نسخة pdfjs: `npm list pdfjs-dist`

---

**جاهز! جرّب الآن 🚀**
