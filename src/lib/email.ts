import { Resend } from "resend";

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY);

export interface EmailTemplateData {
    email: string;
    name?: string;
    code: string;
    token?: string;
    appUrl?: string;
}

export async function sendVerificationCode({
    email,
    name = "المستخدم",
    code,
    token,
    appUrl = typeof window !== "undefined" ? window.location.origin : "",
}: EmailTemplateData) {
    const subject = "✅ تأكيد بريدك الإلكتروني - Lab4";
    const activateUrl = token
        ? `${appUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        : `${appUrl}/verify-email?email=${encodeURIComponent(email)}`;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f6fb; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08); }
    .header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); color: white; padding: 36px 24px; text-align: center; }
    .code-container { background: #f0fdfa; border: 2px dashed #0f766e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; font-size: 36px; font-weight: bold; letter-spacing: 10px; direction: ltr; color: #0f766e; }
    .button { display: inline-block; background: #0f766e; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; }
    .footer { padding: 18px; text-align: center; font-size: 13px; color: #6b7280; }
    h1 { margin: 0 0 8px 0; font-size: 26px; }
    p { margin: 0 0 14px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>مرحباً بك في Lab4</h1>
      <p>${name}</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="text-align: center; font-size: 16px;">
        فعّل حسابك بإحدى الطريقتين: أدخل رمز PIN في صفحة التحقق، أو اضغط رابط التفعيل أدناه.
      </p>

      <h2 style="text-align: center; color: #0f172a; font-size: 18px; margin-top: 8px;">رمز التحقق (PIN)</h2>
      <div class="code-container">${code}</div>

      <p style="text-align: center; color: #64748b; font-size: 14px;">
        الرمز صالح لمدة <strong>30 دقيقة</strong> ولمرة واحدة فقط.
      </p>

      <div style="text-align: center; margin: 28px 0 8px;">
        <a href="${activateUrl}" class="button">تفعيل الحساب بالرابط</a>
      </div>

      <p style="text-align: center; font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 16px;">
        أو انسخ الرابط:<br>${activateUrl}
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

      <p style="text-align: center; color: #64748b; font-size: 13px;">
        إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذه الرسالة.
      </p>
    </div>
    <div class="footer">© Lab4 — جميع الحقوق محفوظة</div>
  </div>
</body>
</html>`;

    try {
        await resend.emails.send({
            from: "Lab4 <noreply@lab4.com>",
            to: [email],
            subject,
            html,
        });
        console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
        console.error("❌ Email send failed:", error);
        throw new Error("فشل في إرسال البريد الإلكتروني");
    }
}

export async function sendResetCode({
    email,
    name = "المستخدم",
    code,
    appUrl = typeof window !== "undefined" ? window.location.origin : "",
}: EmailTemplateData) {
    const subject = "🔑 إعادة تعيين كلمة المرور - Lab4";

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .code-container { background: #fff5f5; border: 3px solid #ff6b6b; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; direction: ltr; color: #ee5a24; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #6c757d; }
    .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    h1 { margin: 0 0 10px 0; font-size: 28px; }
    p { margin: 0 0 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔑 إعادة تعيين كلمة المرور</h1>
    <p>${name}</p>
  </div>
  
  <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <h2 style="color: #333; text-align: center;">رمز إعادة التعيين</h2>
    <div class="code-container">${code}</div>
    
    <p style="text-align: center; font-size: 16px; color: #666;">
      استخدم هذا الرمز لإعادة تعيين كلمة المرور خلال <strong>10 دقائق</strong>.<br>
      الرمز صالح لمرة واحدة فقط.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/forgot-password" class="button">إعادة تعيين كلمة المرور</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="text-align: center; background: #fff8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
      <strong>⚠️ أمان مهم:</strong> إذا لم تطلب إعادة تعيين، تجاهل هذه الرسالة.
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      مع أفضل التحيات،<br>
      <strong>فريق دعم Lab4</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>© 2024 Lab4. جميع الحقوق محفوظة.</p>
  </div>
</body>
</html>`;

    try {
        await resend.emails.send({
            from: "Lab4 <noreply@lab4.com>",
            to: [email],
            subject,
            html,
        });
        console.log(`✅ Reset code sent to ${email}`);
    } catch (error) {
        console.error("❌ Email send failed:", error);
        throw new Error("فشل في إرسال رمز إعادة التعيين");
    }
}
