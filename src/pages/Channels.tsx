import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Star, Search, Filter, CheckCircle, Building2, GraduationCap, Landmark, Briefcase, User } from "lucide-react";
import { Link } from "react-router-dom";
import { channelsData, getCategories, getChannelTypeLabel, type ChannelType } from "@/data/channelsData";

const getChannelTypeIcon = (type: ChannelType) => {
  switch (type) {
    case "ministry":
      return <Landmark className="w-4 h-4" />;
    case "school":
      return <GraduationCap className="w-4 h-4" />;
    case "organization":
      return <Building2 className="w-4 h-4" />;
    case "company":
      return <Briefcase className="w-4 h-4" />;
    case "individual":
      return <User className="w-4 h-4" />;
  }
};

const Channels = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  const categories = getCategories();

  const filteredChannels = channelsData.filter((channel) => {
    const matchesSearch = channel.name.includes(searchTerm) ||
      channel.description.includes(searchTerm) ||
      channel.aboutOwner.includes(searchTerm);
    const matchesCategory = selectedCategory === "الكل" || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen font-cairo" dir="rtl">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              استكشف <span className="text-primary">القنوات</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              اختر من بين قنوات الوزارات والمدارس والمؤسسات وتعلم محتوى تعليمي متميز
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث عن قناة أو مؤسسة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-12 h-12"
                />
              </div>
              <Button variant="outline" className="h-12 gap-2">
                <Filter className="w-4 h-4" />
                فلترة
              </Button>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full"
                >
                  {category}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredChannels.map((channel, index) => (
                <motion.div
                  key={channel.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link to={`/channel/${channel.id}`}>
                    <Card variant="interactive" className="h-full overflow-hidden group">
                      {/* Cover Image */}
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={channel.coverImage}
                          alt={channel.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />

                        {/* Logo */}
                        <div className="absolute -bottom-8 right-4">
                          <div className="w-16 h-16 rounded-xl border-4 border-background overflow-hidden shadow-lg">
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Type & Category Badges */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <span className="px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
                            {getChannelTypeIcon(channel.type)}
                            {getChannelTypeLabel(channel.type)}
                          </span>
                        </div>
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                            {channel.category}
                          </span>
                        </div>
                      </div>

                      <CardContent className="pt-10 pb-5 px-5">
                        {/* Channel Name & Verification */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">{channel.name}</h3>
                          {channel.verified && (
                            <CheckCircle className="w-5 h-5 text-primary fill-primary/20" />
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {channel.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm pt-4 border-t">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{channel.followers.toLocaleString("ar-SA")} متابع</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>{channel.contents.length} محتوى</span>
                          </div>
                          <div className="flex items-center gap-1 text-warning">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{channel.rating}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredChannels.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg">لم يتم العثور على قنوات</p>
              <p className="text-sm text-muted-foreground mt-2">جرّب البحث بكلمات مختلفة</p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Channels;
