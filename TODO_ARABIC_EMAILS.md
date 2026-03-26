# TODO: Arabic Auth Emails (Clerk Templates)
Status: ✅ Started - 1/5 Complete

## Breakdown Steps (Execute Sequentially)

### 1. [ ] Update Clerk "Email Address Verification" Template (Create/Register)
- Dashboard: https://dashboard.clerk.com → Email → Templates → **Email address verification**
```
Subject: ✅ تأكيد بريدك الإلكتروني - Lab4 🎓

مرحباً {{user.name || 'الطالب/المعلم'}}،

شكراً لتسجيلك في Lab4! 

رمز التحقق (6 أرقام): 
{{code}} 

أدخل الرمز في التطبيق خلال 10 دقائق.

لوحة Lab4: https://your-domain.com/register

فريق Lab4
```

### 2. [ ] Update Clerk "Reset Password" Template (Forgot Password)
- Dashboard → Email → **Reset password**
```
Subject: 🔑 إعادة تعيين كلمة المرور - Lab4

مرحباً،

لإعادة تعيين كلمة مرور حسابك:

رمز التحقق: {{code}}

الرمز صالح لمدة 10 دقائق فقط.

صفحة النسيان: https://your-domain.com/forgot-password

إذا لم تطلب هذا، تجاهل الرسالة.

Lab4 Support
```

### 3. [ ] Test Send Test Emails (Both Templates)
- Use Clerk "Send test" → your email → Verify Arabic content.

### 4. [ ] Test Live Flows
```
Terminal: npm run dev
1. Register new → check email language
2. Forgot Password → check reset email
```

### 5. [ ] [Complete] Update this TODO
- Mark all [✅] → Delete or archive.

## Notes
- RTL: Ensure HTML uses `dir=rtl` + Cairo font if custom.
- Domain: Replace `your-domain.com` with live URL.
- No code changes needed.

Next: Execute step-by-step, update TODO after each.

