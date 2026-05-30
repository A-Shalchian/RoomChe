"use client";

import { motion } from "motion/react";
import { Wordmark } from "@/features/items/dashboard/wordmark";
import { UserMenu } from "@/features/items/dashboard/user-menu";
import { QueueIndicator } from "@/features/items/dashboard/queue-indicator";

export function DashboardHeader({ email }: { email: string | undefined }) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 1] }}
      className="relative border-b-[6px] px-6 py-4 sm:px-10"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4">
        <Wordmark />
        <div className="flex items-center gap-3">
          <QueueIndicator />
          <UserMenu email={email} />
        </div>
      </div>
    </motion.header>
  );
}
