import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Sparkles, ShieldCheck, UserCheck, School } from "lucide-react";
import { supabase } from "@/lib/supabase";
import md5 from "js-md5";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OrgSubscriptionSection = () => {
  const [orgName, setOrgName] = useState("");
  const [orgKind, setOrgKind] = useState<"EDUCATIONAL" | "ENRICHMENT" | "BOTH">("BOTH");
  const [orgPlan, setOrgPlan] = useState<"INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL">("INSTITUTION_FULL");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPassword2, setAdminPassword2] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");

  const slugifyAscii = (input: string) =>
    input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

  const handleOrgSubscriptionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestMessage("");
    setRequestError("");

    const name = orgName.trim();
    const aName = adminName.trim();
    const email = adminEmail.trim().toLowerCase();
    if (!name || !aName || !email) {
      setRequestError("يرجى تعبئة كل البيانات المطلوبة");
      return;
    }
    if (adminPassword.length < 6) {
      setRequestError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (adminPassword !== adminPassword2) {
      setRequestError("تأكيد كلمة المرور غير مطابق");
      return;
    }

    setRequestLoading(true);
    try {
      const now = new Date().toISOString();
      const baseSlug = slugifyAscii(name) || `org-${Date.now().toString(36)}`;
      const orgSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);

      const { data: createdOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name,
          slug: orgSlug,
          kind: orgKind,
          subscription_package: orgPlan,
          is_active: false,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (orgErr) throw orgErr;

      const { data: createdAdmin, error: adminErr } = await supabase
        .from("users")
        .insert({
          email,
          name: aName,
          role: "ADMIN",
          verified: false,
          is_active: false,
          organization_id: createdOrg.id,
          details: "بانتظار موافقة السوبر أدمن",
          password_hash: String(md5(adminPassword)).toLowerCase(),
          individual_tier: null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (adminErr) throw adminErr;

      const { error: reqErr } = await supabase.from("registration_requests").upsert(
        {
          applicant_user_id: createdAdmin.id,
          applicant_role: "ADMIN",
          organization_id: createdOrg.id,
          approver_role: "SUPERADMIN",
          requested_package: orgPlan,
          status: "PENDING",
          created_at: now,
          updated_at: now,
        },
        { onConflict: "applicant_user_id" }
      );
      if (reqErr) throw reqErr;

      setRequestMessage("تم إرسال طلب اشتراك المؤسسة بنجاح. سيتم التفعيل بعد موافقة السوبر أدمن.");
      setOrgName("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminPassword2("");
      setOrgKind("BOTH");
      setOrgPlan("INSTITUTION_FULL");
    } catch (err: any) {
      setRequestError(err?.message || "تعذر إرسال الطلب، حاول مرة أخرى.");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-primary/[0.03] to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-6xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <Card className="lg:col-span-2 border-primary/20 shadow-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">اشترك كمؤسسة بسهولة</CardTitle>
                <CardDescription>
                  نموذج مخصص للمدارس والمؤسسات التعليمية والإثرائية مع مسار تفعيل رسمي عبر السوبر أدمن.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">موافقة السوبر أدمن</Badge>
                  <Badge variant="outline">SUPERADMIN</Badge>
                  <Badge variant="outline">إدارة اشتراك احترافية</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border p-3 bg-muted/30 flex items-start gap-2">
                    <School className="w-4 h-4 mt-0.5 text-primary" />
                    <p>١) أرسل طلب المؤسسة مع الباقة وبيانات الأدمن.</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5 text-primary" />
                    <p>٢) السوبر أدمن يراجع ويؤكد الطلب من لوحة التحكم.</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30 flex items-start gap-2">
                    <UserCheck className="w-4 h-4 mt-0.5 text-primary" />
                    <p>٣) يتم تفعيل حساب الأدمن واشتراك المؤسسة مباشرة.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-primary/20 shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-7 h-7" />
                </div>
                <CardTitle className="text-center">طلب اشتراك مؤسسة / مدرسة</CardTitle>
                <CardDescription className="text-center">
                  أدخل البيانات مرة واحدة وسيتابع فريق الإدارة التفعيل.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrgSubscriptionRequest} className="space-y-3">
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="اسم المؤسسة / المدرسة" required />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select value={orgKind} onValueChange={(v: "EDUCATIONAL" | "ENRICHMENT" | "BOTH") => setOrgKind(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="نوع المؤسسة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">تعليمية + إثرائية</SelectItem>
                        <SelectItem value="EDUCATIONAL">تعليمية</SelectItem>
                        <SelectItem value="ENRICHMENT">إثرائية</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={orgPlan} onValueChange={(v: "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL") => setOrgPlan(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="الباقة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSTITUTION_ADMIN_STUDENT">أدمن + طالب</SelectItem>
                        <SelectItem value="INSTITUTION_FULL">أدمن + معلم + طالب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="اسم أدمن المؤسسة" required />
                  <Input type="email" dir="ltr" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.com" required />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input type="password" dir="ltr" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="كلمة المرور" required />
                    <Input type="password" dir="ltr" value={adminPassword2} onChange={(e) => setAdminPassword2(e.target.value)} placeholder="تأكيد كلمة المرور" required />
                  </div>
                  <Button type="submit" className="w-full h-11 text-base" disabled={requestLoading}>
                    {requestLoading ? "جارٍ إرسال الطلب..." : "إرسال طلب الاشتراك"}
                  </Button>
                  {requestMessage && (
                    <p className="text-xs text-emerald-600 text-center flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {requestMessage}
                    </p>
                  )}
                  {requestError && <p className="text-xs text-red-500 text-center">{requestError}</p>}
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OrgSubscriptionSection;
