import { motion } from "framer-motion";
import { Play, Users, BookOpen, Trophy, Clock, BarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: BookOpen,
    title: "صمم محتواك",
    description: " ارفع ملفاتك، فيدوهاتك، صوتياتك، وحولها لأسئلة تفاعلية ذات أثر",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "منافسات وتحديات",
    description: "حول محتواك إلى أنشطة فردية أو جماعية مثيرة",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Trophy,
    title: "لوحة المتصدرين",
    description: "حفز طلابك على الصدارة من خلال الحصول على شارات وإنجازات ونقاط التحدي",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Clock,
    title: "تعليم تفاعلي",
    description: "صح وخطأ، أسئلة متعددة، مطابقة، كروت تعليمية ..إلخ",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Play,
    title: "تعليم تلعيبي",
    description: "دروان العجلة، أطول برج، اكتشف الصورة، جمع الذهب ..إلخ",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: BarChart,
    title: "تقارير أداء",
    description: "قس الأثر التعليمي لمحتواك عبر تقنيات تحليل ورصد متقدمة",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            لماذا <span className="text-primary">التحدي</span>؟
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            منصة متكاملة تجمع بين التعلم والمتعة في تجربة واحدة لا تُنسى
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card variant="interactive" className="h-full">
                <CardContent className="p-6 md:p-8">
                  <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
