# Content Upload Feature - Quick Reference Guide

## 🎯 Feature Overview

Teachers can now upload educational content (images and PDFs) or add direct links to the Supabase storage, making it easy for students to access the material.

---

## 👨‍🏫 FOR TEACHERS

### Access the Feature
1. Go to **Dashboard** → **Content** (محتوى)
2. You'll see two tabs:
   - **Upload Files** (تحميل الملفات)
   - **Add Link** (إضافة رابط)

### Upload Files

**Supported Formats:**
- Images: JPG, PNG, GIF, WebP
- Documents: PDF
- Max Size: 50MB per file

**Steps:**
1. Click **Upload Files** tab
2. Drag and drop a file or click to browse
3. File is selected automatically
4. Click **Upload File** button
5. File appears in "Content Uploaded" section

### Add Link

**Steps:**
1. Click **Add Link** tab
2. Enter Content Title (e.g., "Chapter 1 Explanation")
3. Enter Full URL (must start with http:// or https://)
4. Click **Add Link** button
5. Link appears in "Content Uploaded" section

### Manage Content

**View:**
- Click the **eye icon** to view/open the content
- Click the **download icon** to download PDF files

**Delete:**
- Click the **trash icon** to remove content permanently

**Info Displayed:**
- File/Title name
- Upload date and time
- File size (for uploaded files)
- Content type (image/PDF/link)

---

## 👨‍🎓 FOR STUDENTS

### View Teacher's Content

Access teacher's content through the Topic or Subject view.

### Search & Filter

**Search Bar:**
- Type to search for specific content by name

**Filter Buttons:**
- **All** (الكل): Show all content
- **Images** (الصور): Show images only
- **PDFs**: Show PDF files only
- **Links** (الروابط): Show links only

### View & Download

**Images:**
- Click to view at full size
- Save from your browser

**PDFs:**
- Click **eye icon** to view
- Click **download icon** to download

**Links:**
- Click to open in new tab

---

## 🔧 Technical Details

### Storage
- **Location**: Supabase Storage → `teacher-content/[teacher-id]/content/`
- **Type**: Public read-only access
- **Limits**: 50MB per file, unlimited files per account

### Security
- Teachers can only upload to their own folder
- Students can only view, not modify
- All access authenticated through Supabase Auth

### File Structure
```
teacher-content/
├── teacher-id-1/
│   └── content/
│       ├── image-1.jpg
│       ├── document-1.pdf
│       └── ...
├── teacher-id-2/
│   └── content/
│       └── ...
```

---

## 🆘 Troubleshooting

### Upload Fails
- ✓ Check file size is under 50MB
- ✓ Verify file type is supported
- ✓ Check internet connection
- ✓ Try uploading a different file

### Content Not Visible to Students
- ✓ Verify teacher uploaded content
- ✓ Refresh the page (clear cache)
- ✓ Check teacher ID is correct

### Link Not Opening
- ✓ Verify URL starts with http:// or https://
- ✓ Test the URL directly in browser
- ✓ Check if external site is accessible

---

## 📱 Component Files

### Teacher Component
```
src/pages/dashboard/teacher/components/ContentUploadTab.tsx
```
- Teacher upload interface
- File validation
- Supabase storage integration
- Content management (delete, list)

### Student Component
```
src/pages/dashboard/student/StudentContentView.tsx
```
- Student view of teacher content
- Search and filter functionality
- Content preview/download

### Integration
- Added to Teacher Dashboard as "Content" tab
- Can be added to Student Dashboard or Subject/Topic views

---

## 🚀 Future Enhancements

Planned features:
- [ ] Share content between teachers
- [ ] Student comments on content
- [ ] Content ratings
- [ ] Additional formats (Word, Excel, ZIP)
- [ ] Automatic image compression
- [ ] Content previews
- [ ] Bulk upload
- [ ] Folder organization
- [ ] Version history
- [ ] Content expiration dates

---

## 📋 API Integration

### Upload Endpoint
```typescript
supabase.storage
  .from('teacher-content')
  .upload(`${userId}/content/${filename}`, file)
```

### List Endpoint
```typescript
supabase.storage
  .from('teacher-content')
  .list(`${userId}/content`)
```

### Delete Endpoint
```typescript
supabase.storage
  .from('teacher-content')
  .remove([`${userId}/content/${filename}`])
```

### Get Public URL
```typescript
supabase.storage
  .from('teacher-content')
  .getPublicUrl(`${userId}/content/${filename}`)
```

---

## ✅ Checklist

Before going live:
- [ ] Test file uploads with various formats
- [ ] Test file deletion
- [ ] Test link addition
- [ ] Test student view access
- [ ] Test search functionality
- [ ] Test filter buttons
- [ ] Verify Supabase bucket is public
- [ ] Check storage permissions are correct
- [ ] Test on mobile devices
- [ ] Clear browser cache between tests

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Verify all required environment variables are set
3. Check Supabase dashboard for bucket status
4. Review browser console for errors
5. Contact system administrator

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✓
