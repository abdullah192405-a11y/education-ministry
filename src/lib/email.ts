import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY);

export interface EmailTemplateData {
  email: string;
  name?: string;
  code: string;
  appUrl?: string;
}

export async function sendVerificationCode({ email, name = 'المستخدم', code, appUrl = window.location.origin }: EmailTemplateData) {
  const subject = '✅ تأكيد بريدك الإلكتروني - Lab4 🎓';

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .code-container { background: #f8f9ff; border: 3px solid #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; direction: ltr; color: #667eea; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #6c757d; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    h1 { margin: 0 0 10px 0; font-size: 28px; }
    p { margin: 0 0 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Lab4 - مرحباً بك! 🎓</h1>
    <p>${name}</p>
  </div>
  
  <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <h2 style="color: #333; text-align: center;">رمز التحقق الخاص بك</h2>
    <div class="code-container">${code}</div>
    
    <p style="text-align: center; font-size: 16px; color: #666;">
      أدخل هذا الرمز في التطبيق خلال <strong>10 دقائق</strong>.<br>
      إذا لم تقم بطلب هذا الرمز، يمكنك تجاهل الرسالة.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/register" class="button">فتح Lab4</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="text-align: center; color: #666; font-size: 14px;">
      مع أطيب التحيات،<br>
      <strong>فريق Lab4</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>© 2024 Lab4. جميع الحقوق محفوظة.</p>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'Lab4 <noreply@lab4.com>',
      to: [email],
      subject,
      html,
    });
    console.log(`✅ Verification code sent to ${email}`);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('فشل في إرسال البريد الإلكتروني');
  }
}

export async function sendResetCode({ email, name = 'المستخدم', code, appUrl = window.location.origin }: EmailTemplateData) {
  const subject = '🔑 إعادة تعيين كلمة المرور - Lab4';

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
      from: 'Lab4 <noreply@lab4.com>',
      to: [email],
      subject,
      html,
    });
    console.log(`✅ Reset code sent to ${email}`);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('فشل في إرسال رمز إعادة التعيين');
  }
}

