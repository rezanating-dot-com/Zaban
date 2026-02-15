"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetText } from "@/components/target-text";
import { Loader2, BookmarkCheck } from "lucide-react";
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
  const [gender, setGender] = useState<string>("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setGender(data.addresseeGender || "masculine"));
  }, []);

  const saveTranslation = async (sourceText: string, data: TranslationResult) => {
    try {
      const res = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reference",
          languageCode: activeLanguage,
          sourceText,
          translation: data.translation,
          transliteration: data.transliteration || null,
          notes: data.notes || null,
          breakdown: data.breakdown ? JSON.stringify(data.breakdown) : null,
        }),
      });
      if (res.ok) setSaved(true);
    } catch {
      // Silent fail — translation is still shown, just not persisted
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/translate/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: activeLanguage, addresseeGender: gender }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        saveTranslation(text, data);
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

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Enter English text to get an Arabic translation.
        </p>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="masculine">Masculine</SelectItem>
            <SelectItem value="feminine">Feminine</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
              {saved && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Arabic</p>
              <TargetText as="div" className="text-xl sm:text-3xl font-bold">
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
