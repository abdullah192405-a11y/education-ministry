# Integration Guide - Adding StudentContentView to Dashboard

## Overview

This guide shows how to add the `StudentContentView` component to various parts of the application.

---

## Option 1: Add to Student Dashboard

### Location
`src/pages/dashboard/student/index.tsx`

### Step 1: Import Component
```tsx
import StudentContentView from './StudentContentView';
```

### Step 2: Add to Navigation Tabs
```tsx
// In the navigation array, add:
{ id: "content", icon: Upload, label: "المحتوى" }
```

### Step 3: Add Tab Content
```tsx
{activeTab === "content" && (
  <StudentContentView teacherId={profile?.teacher_id || ""} />
)}
```

### Step 4: Import Icon
```tsx
import { Upload } from "lucide-react";
```

---

## Option 2: Add to Topic View

### Location
`src/pages/TopicView.tsx`

### Step 1: Import Component
```tsx
import StudentContentView from '@/pages/dashboard/student/StudentContentView';
```

### Step 2: Add to Component
```tsx
// After main topic content:
<StudentContentView teacherId={teacherIdForThisTopic} />
```

### Step 3: Get Teacher ID
```tsx
// From topic data:
const teacherId = topic?.subject?.teacher_id;
```

---

## Option 3: Add to Subject View

### Location
`src/pages/SubjectView.tsx`

### Step 1: Import Component
```tsx
import StudentContentView from '@/pages/dashboard/student/StudentContentView';
```

### Step 2: Add Tab
```tsx
<TabsList>
  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
  <TabsTrigger value="content">محتوى المعلم</TabsTrigger>
</TabsList>

<TabsContent value="content">
  <StudentContentView teacherId={subject?.teacher_id || ""} />
</TabsContent>
```

---

## Option 4: Add to Grade View

### Location
`src/pages/GradeDetail.tsx`

### Implementation
```tsx
import StudentContentView from '@/pages/dashboard/student/StudentContentView';

// In grade detail, add a section:
<Card>
  <CardHeader>
    <CardTitle>محتوى المدرسة</CardTitle>
  </CardHeader>
  <CardContent>
    {gradeTeachers?.map(teacher => (
      <div key={teacher.id} className="mb-6">
        <h3 className="font-bold mb-4">{teacher.name}</h3>
        <StudentContentView teacherId={teacher.id} />
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Option 5: Standalone Page Route

### Location
`src/pages/TeacherContent.tsx`

### Create New Page
```tsx
import { useParams } from 'react-router-dom';
import StudentContentView from '@/pages/dashboard/student/StudentContentView';

export default function TeacherContentPage() {
  const { teacherId } = useParams();
  
  return (
    <div className="container mx-auto p-6">
      <StudentContentView teacherId={teacherId || ""} />
    </div>
  );
}
```

### Add Route
```tsx
// In App.tsx
import TeacherContent from './pages/TeacherContent';

<Route path="/teacher/:teacherId/content" element={<TeacherContent />} />
```

---

## Complete Example: Adding to Student Dashboard

Here's a complete example of adding StudentContentView to the student dashboard:

### File: `src/pages/dashboard/student/index.tsx`

```tsx
// 1. Add import at the top
import StudentContentView from './StudentContentView';
import { Upload } from 'lucide-react'; // Add Upload icon

// 2. In the navigation menu, update the tabs array:
const navigationTabs = [
  { id: "overview", icon: Trophy, label: "نظرة عامة" },
  { id: "progress", icon: TrendingUp, label: "التقدم" },
  { id: "challenges", icon: Target, label: "التحديات" },
  { id: "content", icon: Upload, label: "محتوى المعلم" }, // NEW
  { id: "achievements", icon: Award, label: "الإنجازات" },
  { id: "settings", icon: Settings, label: "الإعدادات" }
];

// 3. In the tab content section, add:
{activeTab === "content" && (
  <StudentContentView teacherId={profile?.teacher_id || ""} />
)}

// 4. That's it!
```

---

## Required Props

```tsx
interface StudentContentViewProps {
  teacherId: string;  // ID of the teacher whose content to display
}
```

---

## Styling Notes

The component is self-contained and includes:
- ✅ Full responsive design
- ✅ Dark mode support (via Tailwind)
- ✅ RTL-ready for Arabic
- ✅ Consistent with existing UI

No additional CSS needed!

---

## Theming

The component uses Shadcn UI components which automatically match your theme:

```tsx
// These colors are automatically applied:
// - Primary colors
// - Foreground colors
// - Border colors
// - Background colors
```

---

## Error Handling

The component includes built-in error handling:
- ✅ Network errors
- ✅ Missing teacher ID
- ✅ Empty content list
- ✅ Loading states

---

## Performance Considerations

- 📊 **Lazy Loading**: Content loads only when tab is active
- 🚀 **Optimized Queries**: Uses efficient Supabase queries
- 💾 **Caching**: React Query handles caching
- 🔄 **Real-time**: Updates when new content is uploaded

---

## Troubleshooting

### Component Not Showing
1. Verify teacherId is passed correctly
2. Check Supabase connection
3. Ensure teacher has uploaded content
4. Check browser console for errors

### Content Not Loading
1. Verify Supabase bucket exists: `teacher-content`
2. Check bucket permissions are set to public
3. Verify teacher ID is valid
4. Check network tab for failed requests

### Styling Issues
1. Verify Shadcn UI is properly configured
2. Check Tailwind CSS is loaded
3. Clear browser cache
4. Check for CSS conflicts

---

## Advanced Usage

### Custom Container
```tsx
<div className="custom-container">
  <StudentContentView teacherId={teacherId} />
</div>
```

### With Custom Header
```tsx
<Card>
  <CardHeader>
    <CardTitle>Content from {teacherName}</CardTitle>
  </CardHeader>
  <CardContent>
    <StudentContentView teacherId={teacherId} />
  </CardContent>
</Card>
```

### In Modal
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <StudentContentView teacherId={teacherId} />
  </DialogContent>
</Dialog>
```

---

## Quick Copy-Paste

### Minimal Integration
```tsx
// 1. Import
import StudentContentView from '@/pages/dashboard/student/StudentContentView';

// 2. Use
<StudentContentView teacherId="teacher-id-here" />
```

---

## FAQ

**Q: Can I display multiple teachers' content?**  
A: Yes, loop through teachers and create multiple instances:
```tsx
{teachers.map(teacher => (
  <StudentContentView key={teacher.id} teacherId={teacher.id} />
))}
```

**Q: Can I customize the styling?**  
A: Yes, wrap it in a custom container and add CSS classes.

**Q: Does it work offline?**  
A: No, it requires internet connection to fetch from Supabase.

**Q: Can students edit content?**  
A: No, it's read-only by design.

**Q: How often does it refresh?**  
A: On load and when student manually refreshes the page.

---

## Summary

`StudentContentView` is a flexible, reusable component that can be added to:
- ✅ Student Dashboard
- ✅ Topic Views
- ✅ Subject Views
- ✅ Grade Views
- ✅ Standalone Pages
- ✅ Modals/Dialogs
- ✅ Custom Pages

With minimal setup and no additional styling needed!

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Ready to Use ✅
