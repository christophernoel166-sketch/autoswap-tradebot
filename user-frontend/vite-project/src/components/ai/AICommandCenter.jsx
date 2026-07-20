// src/components/ai/AICommandCenter.jsx

import useAI from "../../hooks/useAI";

import AIStatCard from "./AIStatCard";
import AISectionHeader from "./AISectionHeader";

export default function AICommandCenter() {
    const { aiState } = useAI();

    const cards = [
        {
            title: "AI Status",
            value: aiState.system.status,
            icon: "🟢",
            color: "green",
        },
        {
            title: "Confidence",
            value: `${aiState.analysis.confidence ?? 0}%`,
            icon: "📈",
            color: "cyan",
        },
        {
            title: "Market",
            value: aiState.market.mode,
            icon: "🌍",
            color: "blue",
        },
        {
            title: "Current Task",
            value:
                aiState.system.currentTask ??
                "Idle",
            icon: "⚙️",
            color: "yellow",
        },
        {
            title: "Protected",
            value: aiState.portfolio.protected,
            icon: "🛡️",
            color: "purple",
        },
        {
            title: "Health",
            value: aiState.system.health,
            icon: "❤️",
            color: "green",
        },
    ];

    return (
        <section className="mb-8">
            <AISectionHeader />

            <div
                className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    xl:grid-cols-3
                    2xl:grid-cols-6
                    gap-4
                "
            >
                {cards.map((card) => (
                    <AIStatCard
                        key={card.title}
                        {...card}
                    />
                ))}
            </div>
        </section>
    );
}