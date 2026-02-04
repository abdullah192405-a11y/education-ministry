import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Play, Star, CheckCircle, Landmark, GraduationCap, Building2, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { channelsData, getChannelTypeLabel, type ChannelType } from "@/data/channelsData";

const getChannelTypeIcon = (type: ChannelType) => {
  switch (type) {
    case "ministry":
      return <Landmark className="w-3 h-3" />;
    case "school":
      return <GraduationCap className="w-3 h-3" />;
    case "organization":
      return <Building2 className="w-3 h-3" />;
    case "company":
      return <Briefcase className="w-3 h-3" />;
    default:
      return null;
  }
};

// Get first 4 channels for the homepage
const featuredChannels = channelsData.slice(0, 4);

const ChannelsSection = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              قنوات <span className="text-primary">مميزة</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              اكتشف قنوات الوزارات والمدارس والمؤسسات التعليمية
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/channels">عرض جميع القنوات</Link>
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredChannels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link to={`/channel/${channel.id}`}>
                <Card variant="interactive" className="h-full overflow-hidden group">
                  {/* Cover Image */}
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={channel.coverImage}
                      alt={channel.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

                    {/* Logo */}
                    <div className="absolute -bottom-6 right-4">
                      <div className="w-12 h-12 rounded-xl border-2 border-background overflow-hidden shadow-lg">
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                        {channel.category}
                      </span>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
                        {getChannelTypeIcon(channel.type)}
                        {getChannelTypeLabel(channel.type)}
                      </span>
                    </div>
                  </div>

                  <CardContent className="pt-8 pb-5 px-5">
                    {/* Name & Verification */}
                    <div className="flex items-center gap-1 mb-2">
                      <h3 className="text-base font-bold line-clamp-1">{channel.name}</h3>
                      {channel.verified && (
                        <CheckCircle className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {channel.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs pt-3 border-t">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{channel.followers.toLocaleString("ar-SA")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Play className="w-3 h-3" />
                        <span>{channel.contents.length} محتوى</span>
                      </div>
                      <div className="flex items-center gap-1 text-warning">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{channel.rating}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ChannelsSection;
