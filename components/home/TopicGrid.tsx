'use client';

import { motion } from 'framer-motion';
import type { Topic, TopicCategory } from '@/types/debate';
import { TOPICS, CATEGORY_LABELS } from '@/lib/topics';
import { TopicCard } from '@/components/home/TopicCard';

interface TopicGridProps {
  selectedTopic: Topic | null;
  onSelectTopic: (topic: Topic) => void;
}

const CATEGORY_ORDER: TopicCategory[] = ['fun', 'school', 'big-ideas'];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export function TopicGrid({ selectedTopic, onSelectTopic }: TopicGridProps) {
  const topicsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    topics: TOPICS.filter((t) => t.category === cat),
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {topicsByCategory.map((group) => (
        <div key={group.category}>
          <h2 className="mb-4 font-display text-xl font-bold text-white/80">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.topics.map((topic) => (
              <motion.div key={topic.id} variants={cardVariants}>
                <TopicCard
                  topic={topic}
                  isSelected={selectedTopic?.id === topic.id}
                  onSelect={onSelectTopic}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
