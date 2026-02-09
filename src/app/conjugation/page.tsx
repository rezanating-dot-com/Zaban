"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Loader2, MoreVertical, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConjugationGrid } from "./conjugation-grid";
import { useLanguage } from "@/components/language-provider";
import { TargetText } from "@/components/target-text";

interface Verb {
  id: number;
  infinitive: string;
  root: string | null;
  form: string | null;
  meaning: string | null;
  masdar: string | null;
  masdarVoweled: string | null;
  verbType: string | null;
  aiGenerated: boolean;
  createdAt: string;
}

interface Conjugation {
  id: number;
  verbId: number;
  tense: string;
  person: string;
  conjugated: string;
  voweled: string | null;
  transliteration: string | null;
}

const arabicForms = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
];

const hasTargetScript = (text: string) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

export default function ConjugationPage() {
  const { activeLanguage } = useLanguage();
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [selectedVerb, setSelectedVerb] = useState<Verb | null>(null);
  const [conjugations, setConjugations] = useState<Conjugation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [inputVerb, setInputVerb] = useState("");
  const [inputForm, setInputForm] = useState("");
  const [verbToDelete, setVerbToDelete] = useState<Verb | null>(null);
  const [retryingVerbId, setRetryingVerbId] = useState<number | null>(null);
  const [showAllVerbs, setShowAllVerbs] = useState(false);
  const [verbSearch, setVerbSearch] = useState("");

  const COLLAPSED_LIMIT = 5;
  const filteredVerbs = useMemo(() => {
    if (!verbSearch.trim()) return verbs;
    const q = verbSearch.trim().toLowerCase();
    return verbs.filter(
      (v) =>
        v.infinitive.toLowerCase().includes(q) ||
        v.meaning?.toLowerCase().includes(q) ||
        v.root?.toLowerCase().includes(q)
    );
  }, [verbs, verbSearch]);

  const visibleVerbs = useMemo(() => {
    if (verbSearch.trim()) return filteredVerbs;
    if (showAllVerbs || filteredVerbs.length <= COLLAPSED_LIMIT) return filteredVerbs;
    const collapsed = filteredVerbs.slice(0, COLLAPSED_LIMIT);
    if (selectedVerb && !collapsed.find((v) => v.id === selectedVerb.id)) {
      const found = filteredVerbs.find((v) => v.id === selectedVerb.id);
      if (found) collapsed.push(found);
    }
    return collapsed;
  }, [filteredVerbs, showAllVerbs, selectedVerb, verbSearch]);

  const fetchVerbs = useCallback(async () => {
    const res = await fetch(`/api/conjugation?lang=${activeLanguage}`);
    const data = await res.json();
    setVerbs(data);
  }, [activeLanguage]);

  const fetchConjugations = async (verbId: number) => {
    setLoading(true);
    const res = await fetch(`/api/conjugation/${verbId}`);
    const data = await res.json();
    setSelectedVerb(data.verb);
    setConjugations(data.conjugations || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVerbs();
    setSelectedVerb(null);
    setConjugations([]);
  }, [fetchVerbs]);

  const handleGenerate = async () => {
    if (!inputVerb.trim()) return;

    const verbs = inputVerb
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (verbs.length === 0) return;

    setGenerating(true);
    let lastData: { verb: Verb; conjugations: Conjugation[] } | null = null;
    let successCount = 0;

    for (const verb of verbs) {
      try {
        const res = await fetch("/api/conjugation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            infinitive: verb,
            form: inputForm || undefined,
            languageCode: activeLanguage,
          }),
        });
        if (res.ok) {
          lastData = await res.json();
          successCount++;
        } else {
          const err = await res.json();
          toast.error(`${verb}: ${err.error || "Generation failed"}`);
        }
      } catch {
        toast.error(`${verb}: Generation failed`);
      }
    }

    if (successCount > 0) {
      toast.success(`Generated ${successCount} conjugation${successCount > 1 ? "s" : ""}`);
      setInputVerb("");
      setInputForm("");
      await fetchVerbs();
      if (lastData) {
        setSelectedVerb(lastData.verb);
        setConjugations(lastData.conjugations || []);
      }
    }

    setGenerating(false);
  };

  const handleDelete = async (verbId: number) => {
    const res = await fetch(`/api/conjugation/${verbId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Verb deleted");
      if (selectedVerb?.id === verbId) {
        setSelectedVerb(null);
        setConjugations([]);
      }
      fetchVerbs();
    }
  };

  const handleRetry = async (verb: Verb) => {
    setRetryingVerbId(verb.id);
    try {
      const res = await fetch(`/api/conjugation/${verb.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Conjugation regenerated");
        await fetchVerbs();
        setSelectedVerb(data.verb);
        setConjugations(data.conjugations || []);
      } else {
        const err = await res.json();
        toast.error(err.error || "Retry failed");
      }
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetryingVerbId(null);
    }
  };

  const getKeyForm = (tense: string, person: string) =>
    conjugations.find((c) => c.tense === tense && c.person === person);

  const pastTenseId = activeLanguage === "ar" ? "past" : "past_simple";
  const presentTenseId = activeLanguage === "ar" ? "present" : "present_simple";
  const hePerson = activeLanguage === "ar" ? "3sm" : "3s";
  const youPerson = activeLanguage === "ar" ? "2sm" : "2s";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Conjugation</h1>
        <p className="text-sm text-muted-foreground">
          Generate and browse verb conjugation tables.
        </p>
      </div>

      {/* Input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          dir="rtl"
          value={inputVerb}
          onChange={(e) => setInputVerb(e.target.value)}
          placeholder="Enter verbs separated by commas, e.g. كَتَبَ, دَرَسَ"
          className="flex-1 font-target text-lg"
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <div className="flex gap-2">
          {activeLanguage === "ar" && (
            <Select value={inputForm} onValueChange={setInputForm}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Form" />
              </SelectTrigger>
              <SelectContent>
                {arabicForms.map((f) => (
                  <SelectItem key={f} value={f}>
                    Form {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={handleGenerate}
            disabled={!inputVerb.trim() || generating}
            className="flex-1 sm:flex-none"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Conjugate"
            )}
          </Button>
        </div>
      </div>

      {/* Verb search + chips */}
      {verbs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search verbs..."
            value={verbSearch}
            onChange={(e) => setVerbSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {verbs.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {visibleVerbs.map((verb) => (
            <Badge
              key={verb.id}
              variant={selectedVerb?.id === verb.id ? "default" : "secondary"}
              className="group cursor-pointer gap-1.5 py-1 px-2.5 text-sm rounded-md"
              onClick={() => fetchConjugations(verb.id)}
            >
              <span className={hasTargetScript(verb.infinitive) ? "font-target" : ""} dir={hasTargetScript(verb.infinitive) ? "rtl" : "ltr"}>
                {verb.infinitive}
              </span>
              {verb.meaning && (
                <span className="font-sans text-xs opacity-60">
                  {verb.meaning}
                </span>
              )}
              {verb.form && (
                <span className="font-sans text-[10px] font-semibold opacity-50">
                  {verb.form}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="ml-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 focus:opacity-100 transition-opacity">
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={retryingVerbId === verb.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(verb);
                    }}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${retryingVerbId === verb.id ? "animate-spin" : ""}`} />
                    {retryingVerbId === verb.id ? "Retrying..." : "Retry"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVerbToDelete(verb);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Badge>
          ))}
          {!verbSearch.trim() && filteredVerbs.length > COLLAPSED_LIMIT && (
            <button
              onClick={() => setShowAllVerbs(!showAllVerbs)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 px-1"
            >
              {showAllVerbs ? "Show less" : `Show all (${filteredVerbs.length})`}
              <ChevronDown className={`h-3 w-3 transition-transform ${showAllVerbs ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!verbToDelete} onOpenChange={(open) => !open && setVerbToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete verb?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong className={hasTargetScript(verbToDelete?.infinitive || "") ? "font-target" : ""}>
                {verbToDelete?.infinitive}
              </strong>
              {verbToDelete?.meaning && ` (${verbToDelete.meaning})`} and all its conjugations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (verbToDelete) {
                  handleDelete(verbToDelete.id);
                  setVerbToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Detail */}
      {selectedVerb && !loading && (
        <>
          <Separator />

          {/* Metadata row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border bg-border overflow-hidden">
            <div className="bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Verbal Noun (Masdar)
              </p>
              <TargetText className="text-2xl font-bold">
                {selectedVerb.masdarVoweled || selectedVerb.masdar || "—"}
              </TargetText>
            </div>
            <div className="bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Root
              </p>
              <TargetText className="text-2xl font-bold">
                {selectedVerb.root || "—"}
              </TargetText>
            </div>
            <div className="bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Meaning
              </p>
              <p className="text-base font-semibold">
                {selectedVerb.meaning || "—"}
              </p>
            </div>
            <div className="bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Type
              </p>
              <p className="text-sm">{selectedVerb.verbType || "—"}</p>
            </div>
          </div>

          {/* Key forms */}
          {conjugations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Key Forms</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-lg border bg-border overflow-hidden">
                <KeyFormCell
                  title="Past"
                  forms={[
                    { label: "1s", conj: getKeyForm(pastTenseId, "1s") },
                    {
                      label: "3s",
                      conj:
                        getKeyForm(pastTenseId, hePerson) ||
                        getKeyForm(pastTenseId, "3s"),
                    },
                  ]}
                />
                <KeyFormCell
                  title="Present"
                  forms={[
                    { label: "1s", conj: getKeyForm(presentTenseId, "1s") },
                    {
                      label: "3s",
                      conj:
                        getKeyForm(presentTenseId, hePerson) ||
                        getKeyForm(presentTenseId, "3s"),
                    },
                  ]}
                />
                <KeyFormCell
                  title="Imperative"
                  forms={[
                    {
                      label: "2s",
                      conj:
                        getKeyForm("imperative", youPerson) ||
                        getKeyForm("imperative", "2s"),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Full table */}
          {conjugations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Full Conjugation</p>
              <ConjugationGrid conjugations={conjugations} />
            </div>
          )}
        </>
      )}

      {!selectedVerb && !loading && verbs.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Enter a verb above to generate its conjugation table.
        </div>
      )}
    </div>
  );
}

function KeyFormCell({
  title,
  forms,
}: {
  title: string;
  forms: {
    label: string;
    conj: { conjugated: string; voweled: string | null } | undefined;
  }[];
}) {
  return (
    <div className="bg-card p-3 space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {forms.map((f, i) => (
        <div key={i}>
          <p className="text-[10px] text-muted-foreground">{f.label}</p>
          <TargetText className="text-xl font-semibold leading-tight">
            {f.conj?.voweled || f.conj?.conjugated || "—"}
          </TargetText>
        </div>
      ))}
    </div>
  );
}
