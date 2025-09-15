"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const cardStyle =
    "bg-gray-800/60 backdrop-blur-xl border border-white/10 shadow-lg";

  return (
    <Card className={cardStyle}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400">
          Fitur ini sedang dalam pengembangan dan akan segera tersedia.
        </p>
      </CardContent>
    </Card>
  );
}
