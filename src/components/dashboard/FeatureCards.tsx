import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  url: string;
}

interface FeatureCardsProps {
  cards: FeatureCard[];
}

export function FeatureCards({ cards }: FeatureCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <button
          key={card.title}
          onClick={() => navigate(card.url)}
          className={`${card.color} text-white rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-lg`}
        >
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-8">
            <card.icon className="h-5 w-5" />
          </div>
          <h3 className="font-display font-bold text-base">{card.title}</h3>
          <p className="text-white/70 text-xs mt-1">{card.description}</p>
        </button>
      ))}
    </div>
  );
}
