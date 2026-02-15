import { TargetText } from "@/components/target-text";

export interface WordBreakdown {
  word: string;
  transliteration: string;
  meaning: string;
  parts?: { arabic: string; transliteration: string; meaning: string }[];
}

const PART_COLORS = [
  { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950" },
  { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
  { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
  { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950" },
];

export function BreakdownCard({ item }: { item: WordBreakdown }) {
  if (item.parts && item.parts.length > 1) {
    return (
      <div className="rounded-lg border bg-muted/50 px-3 py-2 text-center">
        <TargetText className="text-lg font-semibold">
          {item.parts.map((part, i) => (
            <span key={i} className={PART_COLORS[i % PART_COLORS.length].text}>
              {part.arabic}
            </span>
          ))}
        </TargetText>
        <div className="flex justify-center gap-1.5 mt-1">
          {item.parts.map((part, i) => {
            const color = PART_COLORS[i % PART_COLORS.length];
            return (
              <span
                key={i}
                className={`inline-flex flex-col items-center rounded px-1.5 py-0.5 ${color.bg}`}
              >
                <span className={`text-[10px] ${color.text}`}>
                  {part.transliteration}
                </span>
                <span className={`text-[10px] font-medium ${color.text}`}>
                  {part.meaning}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/50 px-3 py-2 text-center">
      <TargetText className="text-lg font-semibold">{item.word}</TargetText>
      <p className="text-xs text-muted-foreground">{item.transliteration}</p>
      <p className="text-xs font-medium">{item.meaning}</p>
    </div>
  );
}

export function BreakdownCardCompact({ item }: { item: WordBreakdown }) {
  if (item.parts && item.parts.length > 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded border bg-muted/50 px-2 py-1 text-sm">
        <TargetText className="font-semibold">
          {item.parts.map((part, i) => (
            <span key={i} className={PART_COLORS[i % PART_COLORS.length].text}>
              {part.arabic}
            </span>
          ))}
        </TargetText>
        <span className="text-muted-foreground">(</span>
        {item.parts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span className="text-muted-foreground">+</span>}
            <span className={PART_COLORS[i % PART_COLORS.length].text}>
              {part.meaning}
            </span>
          </span>
        ))}
        <span className="text-muted-foreground">)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border bg-muted/50 px-2 py-1 text-sm">
      <TargetText className="font-semibold">{item.word}</TargetText>
      <span className="text-muted-foreground">({item.transliteration})</span>
      <span>{item.meaning}</span>
    </span>
  );
}
