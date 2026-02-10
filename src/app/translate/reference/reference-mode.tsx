"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetText } from "@/components/target-text";
import { Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/language-provider";

interface WordBreakdown {
  word: string;
  transliteration: string;
  meaning: string;
}

interface TranslationResult {
  translation: string;
  transliteration: string;
  notes: string;
  breakdown?: WordBreakdown[];
}

export function ReferenceMode() {
  const { activeLanguage } = useLanguage();
  const [text, setText] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/translate/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: activeLanguage }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        toast.error(err.error || "Translation failed");
      }
    } catch {
      toast.error("Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reference",
          languageCode: activeLanguage,
          sourceText: text,
          translation: result.translation,
          transliteration: result.transliteration || null,
          notes: result.notes || null,
          breakdown: result.breakdown ? JSON.stringify(result.breakdown) : null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        toast.success("Translation saved");
      } else {
        toast.error("Failed to save translation");
      }
    } catch {
      toast.error("Failed to save translation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Enter English text to get an Arabic translation.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type English text here..."
        rows={3}
      />
      <Button onClick={handleTranslate} disabled={!text.trim() || loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Translating...
          </>
        ) : (
          "Translate"
        )}
      </Button>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Translation</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                disabled={saved || saving}
                title={saved ? "Saved" : "Save translation"}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Arabic</p>
              <TargetText className="text-xl sm:text-3xl font-bold">
                {result.translation}
              </TargetText>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Transliteration
              </p>
              <p className="text-lg">{result.transliteration}</p>
            </div>
            {result.breakdown && result.breakdown.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Word Breakdown
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.breakdown.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-muted/50 px-3 py-2 text-center"
                    >
                      <TargetText className="text-lg font-semibold">
                        {item.word}
                      </TargetText>
                      <p className="text-xs text-muted-foreground">
                        {item.transliteration}
                      </p>
                      <p className="text-xs font-medium">{item.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{result.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
