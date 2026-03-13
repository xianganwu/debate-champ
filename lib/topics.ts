import type { Topic } from '@/types/debate';

export const TOPICS: readonly Topic[] = [
  // Fun & Everyday
  {
    id: 'pizza-lunch',
    text: 'Should school lunches include pizza every day?',
    category: 'fun',
    emoji: '🍕',
  },
  {
    id: 'hotdog-sandwich',
    text: 'Is a hot dog a sandwich?',
    category: 'fun',
    emoji: '🌭',
  },
  {
    id: 'paid-grades',
    text: 'Should kids get paid for good grades?',
    category: 'fun',
    emoji: '💰',
  },
  {
    id: 'summer-winter',
    text: 'Is summer better than winter?',
    category: 'fun',
    emoji: '☀️',
  },
  {
    id: 'recess-length',
    text: 'Should recess be longer than class time?',
    category: 'fun',
    emoji: '⏰',
  },
  {
    id: 'goku-vs-luffy',
    text: 'Who is stronger, Goku or Luffy?',
    category: 'fun',
    emoji: '💥',
  },

  // School Life
  {
    id: 'homework',
    text: 'Should schools have homework?',
    category: 'school',
    emoji: '📚',
  },
  {
    id: 'choose-classes',
    text: 'Should students choose their own classes?',
    category: 'school',
    emoji: '🎒',
  },
  {
    id: 'later-start',
    text: 'Should school start later in the morning?',
    category: 'school',
    emoji: '😴',
  },
  {
    id: 'phones-school',
    text: 'Should phones be allowed in school?',
    category: 'school',
    emoji: '📱',
  },
  {
    id: 'gym-graded',
    text: 'Should gym class be graded?',
    category: 'school',
    emoji: '🏃',
  },

  // Big Ideas
  {
    id: 'zoos',
    text: 'Should zoos exist?',
    category: 'big-ideas',
    emoji: '🦁',
  },
  {
    id: 'cats-vs-dogs',
    text: 'Are cats better pets than dogs?',
    category: 'big-ideas',
    emoji: '🐱',
  },
  {
    id: 'kids-vote',
    text: 'Should kids be allowed to vote?',
    category: 'big-ideas',
    emoji: '🗳️',
  },
  {
    id: 'book-street-smart',
    text: 'Is it better to be book-smart or street-smart?',
    category: 'big-ideas',
    emoji: '🧠',
  },
  {
    id: 'learn-to-code',
    text: 'Should everyone learn to code?',
    category: 'big-ideas',
    emoji: '💻',
  },
] as const;

export const CATEGORY_LABELS: Record<Topic['category'], string> = {
  fun: '🍕 Fun & Everyday',
  school: '🏫 School Life',
  'big-ideas': '🌍 Big Ideas',
};
