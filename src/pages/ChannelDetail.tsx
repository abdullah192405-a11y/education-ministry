import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Star, ChevronLeft, Eye, Clock,
  CheckCircle, Globe, Mail, Phone, Play,
  Building2, GraduationCap, Landmark, Briefcase, User,
  ExternalLink
} from "lucide-react";
import { getChannelById, getChannelTypeLabel, type ChannelType } from "@/data/channelsData";

const getChannelTypeIcon = (type: ChannelType) => {
  switch (type) {
    case "ministry":
      return <Landmark className="w-5 h-5" />;
    case "school":
      return <GraduationCap className="w-5 h-5" />;
    case "organization":
      return <Building2 className="w-5 h-5" />;
    case "company":
      return <Briefcase className="w-5 h-5" />;
    case "individual":
      return <User className="w-5 h-5" />;
  }
};

const ChannelDetail = () => {
  const { id } = useParams();
  const channelId = parseInt(id || "1");
  const channel = getChannelById(channelId);

  if (!channel) {
    return (
      <div className="min-h-screen font-cairo">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="text-3xl font-bold mb-4">القناة غير موجودة</h1>
            <Button asChild>
              <Link to="/channels">العودة للقنوات</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-cairo">
      <Header />
      <main className="pt-20">
        {/* Hero Banner */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={channel.coverImage}
            alt={channel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

          {/* Back Button */}
          <div className="absolute top-6 left-6 right-6">
            <div className="container mx-auto">
              <Link
                to="/channels"
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                العودة للقنوات
              </Link>
            </div>
          </div>
        </div>

        {/* Channel Info Section */}
        <div className="container mx-auto px-4">
          {/* Logo and Basic Info */}
          <div className="relative -mt-16 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row gap-6 items-start"
            >
              {/* Logo */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-background overflow-hidden shadow-xl bg-background">
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 pt-4">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center gap-1">
                    {getChannelTypeIcon(channel.type)}
                    {getChannelTypeLabel(channel.type)}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium">
                    {channel.category}
                  </span>
                  {channel.verified && (
                    <span className="flex items-center gap-1 text-primary text-sm">
                      <CheckCircle className="w-4 h-4 fill-primary/20" />
                      موثّق
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-black mb-2">{channel.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">{channel.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-bold">{channel.followers.toLocaleString("ar-SA")}</span>
                    <span className="text-muted-foreground">متابع</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    <span className="font-bold">{channel.contents.length}</span>
                    <span className="text-muted-foreground">محتوى تعليمي</span>
                  </div>
                  <div className="flex items-center gap-2 text-warning">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold">{channel.rating}</span>
                  </div>
                </div>
              </div>

              {/* Subscribe Button */}
              <div className="mt-4 md:mt-8">
                <Button size="lg" className="gap-2">
                  <Users className="w-4 h-4" />
                  متابعة القناة
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
            {/* Contents List */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Play className="w-6 h-6 text-primary" />
                  المحتويات التعليمية
                </h2>

                {channel.contents.length > 0 ? (
                  <div className="space-y-4">
                    {channel.contents.map((content, index) => (
                      <motion.div
                        key={content.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Link to={`/channel/${channel.id}/content/${content.id}`}>
                          <Card variant="interactive" className="overflow-hidden group">
                            <div className="flex flex-col sm:flex-row">
                              {/* Thumbnail */}
                              <div className="relative sm:w-48 h-36 sm:h-auto overflow-hidden flex-shrink-0">
                                <img
                                  src={content.thumbnail}
                                  alt={content.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play className="w-6 h-6 text-primary fill-primary" />
                                  </div>
                                </div>
                                {/* Quiz Badge */}
                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                                  {content.quiz.length} أسئلة
                                </div>
                              </div>

                              {/* Content Info */}
                              <CardContent className="flex-1 p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <span className="text-xs text-primary font-medium mb-1 block">
                                      {content.targetAudience === "children" ? "للأطفال 👶" : content.targetAudience === "adults" ? "للكبار" : "للجميع 👨‍👩‍👧‍👦"}
                                    </span>
                                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                                      {content.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                      {content.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {content.views.toLocaleString("ar-SA")}
                                      </span>
                                      {content.duration && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          {content.duration}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        {content.media.length} وسائط
                                      </span>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" className="hidden sm:flex gap-1">
                                    ابدأ
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-xl font-bold mb-2">لا يوجد محتوى حالياً</h3>
                    <p className="text-muted-foreground">ستتم إضافة محتويات تعليمية قريباً</p>
                  </Card>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6 sticky top-24"
              >
                {/* About */}
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    {getChannelTypeIcon(channel.type)}
                    عن {getChannelTypeLabel(channel.type)}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {channel.aboutOwner}
                  </p>
                </Card>

                {/* Contact Info */}
                {channel.contactInfo && (
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">معلومات التواصل</h3>
                    <div className="space-y-3">
                      {channel.contactInfo.website && (
                        <a
                          href={channel.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="flex-1 truncate">{channel.contactInfo.website.replace('https://', '')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {channel.contactInfo.email && (
                        <a
                          href={`mailto:${channel.contactInfo.email}`}
                          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Mail className="w-4 h-4 text-primary" />
                          <span>{channel.contactInfo.email}</span>
                        </a>
                      )}
                      {channel.contactInfo.phone && (
                        <a
                          href={`tel:${channel.contactInfo.phone}`}
                          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Phone className="w-4 h-4 text-primary" />
                          <span dir="ltr">{channel.contactInfo.phone}</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {/* Social Links */}
                {channel.socialLinks && Object.keys(channel.socialLinks).length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">تابعنا</h3>
                    <div className="flex flex-wrap gap-2">
                      {channel.socialLinks.twitter && (
                        <a
                          href={`https://twitter.com/${channel.socialLinks.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-[#1DA1F2]/10 text-[#1DA1F2] text-sm font-medium hover:bg-[#1DA1F2]/20 transition-colors"
                        >
                          {channel.socialLinks.twitter}
                        </a>
                      )}
                      {channel.socialLinks.instagram && (
                        <a
                          href={`https://instagram.com/${channel.socialLinks.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-[#E4405F]/10 text-[#E4405F] text-sm font-medium hover:bg-[#E4405F]/20 transition-colors"
                        >
                          {channel.socialLinks.instagram}
                        </a>
                      )}
                    </div>
                  </Card>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChannelDetail;
