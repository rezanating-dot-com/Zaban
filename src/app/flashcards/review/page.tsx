"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TargetText } from "@/components/target-text";
import { qualityLabels } from "@/lib/srs/sm2";
import { RotateCcw, CheckCircle2, BookOpen, Languages, Layers } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface FlashcardData {
  id: number;
  front: string;
  back: string;
  cardType: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

interface SessionStats {
  total: number;
  reviewed: number;
  correct: number;
  incorrect: number;
}

export default function ReviewPage() {
  const { activeLanguage } = useLanguage();
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<"all" | "vocab" | "conjugation">("all");
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    reviewed: 0,
    correct: 0,
    incorrect: 0,
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ lang: activeLanguage });
    if (cardTypeFilter !== "all") params.set("cardType", cardTypeFilter);
    const res = await fetch(`/api/flashcards?${params}`);
    const data = await res.json();
    setCards(data.due || []);
    setStats((prev) => ({ ...prev, total: data.dueCount || 0 }));
    setCurrentIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setLoading(false);
  }, [activeLanguage, cardTypeFilter]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards, activeLanguage]);

  const currentCard = cards[currentIndex];

  const handleReview = async (quality: number) => {
    if (!currentCard) return;

    await fetch("/api/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: currentCard.id, quality }),
    });

    setStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
    }));

    if (currentIndex + 1 >= cards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setFlipped(false);
    }
  };

  const filterButtons = (
    <div className="flex justify-center gap-1">
      {([
        { value: "all", label: "All", icon: Layers },
        { value: "vocab", label: "Vocab", icon: BookOpen },
        { value: "conjugation", label: "Conjugation", icon: Languages },
      ] as const).map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={cardTypeFilter === value ? "default" : "outline"}
          size="sm"
          onClick={() => setCardTypeFilter(value)}
        >
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {filterButtons}
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading cards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {filterButtons}
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h2 className="text-xl font-semibold">No cards due!</h2>
          <p className="text-muted-foreground">
            {cardTypeFilter === "all"
              ? "Add vocabulary or conjugations to create flashcards."
              : `No ${cardTypeFilter} cards due for review.`}
          </p>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const accuracy =
      stats.reviewed > 0
        ? Math.round((stats.correct / stats.reviewed) * 100)
        : 0;

    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        {filterButtons}
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold">Session Complete!</h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">{stats.reviewed}</p>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.incorrect}</p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
        </div>
        <p className="text-muted-foreground">Accuracy: {accuracy}%</p>
        <Button onClick={fetchCards}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Review Again
        </Button>
      </div>
    );
  }

  const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {filterButtons}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>
            {stats.correct} correct, {stats.incorrect} incorrect
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <Card
        className="cursor-pointer min-h-[200px] sm:min-h-[250px] flex items-center justify-center"
        onClick={() => setFlipped(!flipped)}
      >
        <CardContent className="text-center py-12">
          {!flipped ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                {currentCard.cardType === "conjugation"
                  ? "Conjugate"
                  : "Translate to Arabic"}
              </p>
              <p className="text-2xl font-medium">{currentCard.front}</p>
              <p className="text-sm text-muted-foreground mt-4">
                Tap to reveal
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Answer
              </p>
              <TargetText className="text-4xl font-bold">
                {currentCard.back}
              </TargetText>
            </div>
          )}
        </CardContent>
      </Card>

      {flipped && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {qualityLabels.map(({ label, quality, color }) => (
            <Button
              key={quality}
              variant={color}
              onClick={() => handleReview(quality)}
              className="w-full h-12 sm:h-10"
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
