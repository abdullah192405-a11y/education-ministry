import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-cairo">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-9xl font-black text-primary mb-6">٤٠٤</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          عذراً، الصفحة التي تبحث عنها غير موجودة
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild>
            <Link to="/"><Home className="w-4 h-4" />العودة للرئيسية</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/channels"><Search className="w-4 h-4" />استكشف القنوات</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
