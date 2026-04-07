import GameHub from '@/components/game-hub';

export const metadata = {
  title: 'Meme Arcade',
  description: 'A chaotic arcade with Rick Roll Sweeper, Meme Gomoku, and Rick Dino Run.',
};

export default function Home() {
  return <GameHub />;
}