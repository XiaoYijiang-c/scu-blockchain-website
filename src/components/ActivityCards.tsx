import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import {
  BookOpen,
  Blocks,
  Telescope,
  FlaskConical,
  Trophy,
  Network,
} from "lucide-react";

const activityIcons = [
  BookOpen,
  Blocks,
  Telescope,
  FlaskConical,
  Trophy,
  Network,
];

interface Activity {
  number: string;
  title: string;
  text: string;
}

export function ActivityCards({ activities }: { activities: Activity[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
      {activities.map((activity, index) => {
        const Icon = activityIcons[index % activityIcons.length];
        return (
          <article key={activity.number} className="h-full">
            <MagicCard
              className="info-card group h-full"
              gradientColor="var(--primary-glow)"
              gradientFrom="var(--theme-primary)"
              gradientTo="var(--theme-secondary)"
              gradientSize={260}
              gradientOpacity={0.45}
            >
              <CardHeader className="p-0">
                <div className="activity-card-top">
                  <span className="gallery-index">
                    EXPLORE / {activity.number}
                  </span>
                  <Icon aria-hidden="true" />
                </div>
                <CardTitle>
                  <h3>{activity.title}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="mt-3 leading-relaxed text-[var(--white-icon)]">
                  {activity.text}
                </p>
                <span
                  aria-hidden="true"
                  className="mt-6 block h-px w-10 bg-[var(--sec)] transition-all group-hover:w-20"
                />
              </CardContent>
            </MagicCard>
          </article>
        );
      })}
    </div>
  );
}
