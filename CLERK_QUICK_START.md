# Clerk Integration - Quick Reference

## 🚀 Getting Started

### For Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Login page: http://localhost:5173/login
# Register page: http://localhost:5173/register
```

## 📁 Files Modified/Created

| File | Change | Purpose |
|------|--------|---------|
| [.env](.env) | Added `VITE_CLERK_PUBLISHABLE_KEY` | Clerk configuration |
| [src/main.tsx](src/main.tsx) | Wrapped with `<ClerkProvider>` | Initialize Clerk |
| [src/pages/ClerkLogin.tsx](src/pages/ClerkLogin.tsx) | NEW | Clerk sign-in page |
| [src/pages/ClerkRegister.tsx](src/pages/ClerkRegister.tsx) | NEW | Clerk sign-up page |
| [src/App.tsx](src/App.tsx) | Updated routes | Use new auth pages |
| [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) | Refactored | Use Clerk auth |
| [src/hooks/useDatabase.ts](src/hooks/useDatabase.ts) | Updated useUser() | Clerk compatibility |

## 🔐 Authentication Flows

### Login Flow
```
User visits /login
    ↓
Clerk SignIn component displays
    ↓
User enters credentials
    ↓
Clerk authenticates
    ↓
Auto-redirect to /dashboard
```

### Protected Route Flow
```
User accesses /dashboard
    ↓
ProtectedRoute checks useAuth()
    ↓
If not signed in → redirect to /login
    ↓
If signed in → render component
```

## 💻 Common Component Patterns

### Check Authentication Status
```tsx
import { useAuth } from "@clerk/react";

export default function MyPage() {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return <LoadingSpinner />;
  if (!isSignedIn) return <SignInPrompt />;
  
  return <MainContent />;
}
```

### Get User Information
```tsx
import { useUser } from "@clerk/react";

export default function UserProfile() {
  const { user } = useUser();
  
  return (
    <>
      <h1>{user?.firstName} {user?.lastName}</h1>
      <p>{user?.primaryEmailAddress?.emailAddress}</p>
    </>
  );
}
```

### Access User Role (Admin/Teacher/Student)
```tsx
import { useUser } from "@clerk/react";

export default function Dashboard() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role || "STUDENT";
  
  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "TEACHER") return <TeacherDashboard />;
  return <StudentDashboard />;
}
```

### Sign Out User
```tsx
import { useClerk } from "@clerk/react";

export default function SignOutButton() {
  const { signOut } = useClerk();
  
  return (
    <button onClick={() => signOut({ redirectUrl: "/" })}>
      Sign Out
    </button>
  );
}
```

## ⚙️ Configuration

### Customize Sign-In/Up Pages

Edit `src/pages/ClerkLogin.tsx` or `src/pages/ClerkRegister.tsx`:

```tsx
<SignIn 
  appearance={{
    baseTheme: undefined, // or: "light" | "dark"
    elements: {
      rootBox: "your-custom-class",
      card: "shadow-xl rounded-lg",
      // More customization options...
    },
  }}
  // ... other props
/>
```

### Set User Roles

When creating users programmatically:

```tsx
// In Clerk dashboard or backend API
user.publicMetadata = {
  role: "TEACHER", // or "ADMIN", "STUDENT"
};
```

Access in component:
```tsx
const userRole = user?.publicMetadata?.role;
```

## 🧪 Testing

### Test Sign-In/Sign-Up
1. Navigate to `http://localhost:5173/login`
2. Sign up with test email
3. Verify auto-redirect to dashboard

### Test Protected Routes
1. Open browser DevTools → Application → Clear storage
2. Try accessing `/dashboard` → should redirect to `/login`
3. Sign in → should access dashboard

### Test Role-Based Access
1. Update user role in Clerk dashboard
2. Refresh page
3. Verify correct dashboard loads based on role

## 📱 Clerk Dashboard

### Access
- **URL**: https://dashboard.clerk.com
- **Key**: Use your Clerk API key for backend operations

### Configuration Steps
1. Create application
2. Copy `Publishable Key` → add to `.env`
3. Configure sign-in methods
4. Add redirect URLs for production
5. Create custom claims for roles

## 🚨 Common Issues

### Issue: "No Clerk instance found"
**Solution**: Make sure `ClerkProvider` wraps your app in `main.tsx`

### Issue: Clerk component doesn't load
**Solution**: Check that `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env`
- Restart dev server: `npm run dev`

### Issue: Role-based redirects not working
**Solution**: Verify user has `publicMetadata.role` set in Clerk dashboard

### Issue: Styles look broken
**Solution**: Import Clerk CSS (should be automatic, but check console for errors)

## 📚 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [React Components](https://clerk.com/docs/components/overview)
- [useAuth Hook](https://clerk.com/docs/references/react/use-auth)
- [useUser Hook](https://clerk.com/docs/references/react/use-user)
- [Customization Guide](https://clerk.com/docs/components/customization/overview)

## ✅ Integration Checklist

- [x] Installed `@clerk/react`
- [x] Added `VITE_CLERK_PUBLISHABLE_KEY` to `.env`
- [x] Wrapped app with `ClerkProvider`
- [x] Created `ClerkLogin.tsx`
- [x] Created `ClerkRegister.tsx`
- [x] Updated `App.tsx` routes
- [x] Updated `ProtectedRoute.tsx`
- [x] Updated `useDatabase.ts`
- [x] Verified build passes
- [ ] Test sign-up/sign-in flow
- [ ] Configure Clerk dashboard
- [ ] Set user roles in metadata
- [ ] Deploy to production

---

Need more help? Check [CLERK_INTEGRATION.md](CLERK_INTEGRATION.md) for detailed information.
