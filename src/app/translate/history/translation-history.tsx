"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TargetText } from "@/components/target-text";
import { BreakdownCard, BreakdownCardCompact, type WordBreakdown } from "@/components/breakdown-card";
import { Search, Trash2, X, Printer, Merge } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/language-provider";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

interface TranslationItem {
  id: number;
  languageCode: string;
  type: "reference" | "practice";
  sourceText: string;
  translation: string;
  transliteration: string | null;
  notes: string | null;
  breakdown: string | null;
  attempt: string | null;
  score: number | null;
  isCorrect: boolean | null;
  mistakes: string | null;
  feedback: string | null;
  createdAt: string;
}

type TypeFilter = "all" | "reference" | "practice";

function parseBreakdown(raw: string | null): WordBreakdown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseMistakes(raw: string | null): { type: string; explanation: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function TranslationHistory() {
  const { activeLanguage } = useLanguage();
  const [items, setItems] = useState<TranslationItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<"print" | "merge" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<TranslationItem | null>(null);
  const [merging, setMerging] = useState(false);

  const fetchTranslations = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("lang", activeLanguage);
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const res = await fetch(`/api/translations?${params}`);
    const data = await res.json();
    setItems(data);
  }, [search, activeLanguage, typeFilter]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/translations/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Translation deleted");
      if (selectedId === id) setSelectedId(null);
      fetchTranslations();
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const enterSelectionMode = (mode: "print" | "merge") => {
    setSelectionMode(mode);
    setSelectedIds(new Set());
    setSelectedId(null);
  };

  const exitSelectionMode = () => {
    setSelectionMode(null);
    setSelectedIds(new Set());
  };

  const handlePrint = () => {
    if (selectedIds.size === 0) return;
    window.print();
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) return;
    setMerging(true);
    // Use selection order — the order the user clicked determines sentence order
    const orderedIds = Array.from(selectedIds);
    try {
      const res = await fetch("/api/translations/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });
      if (res.ok) {
        toast.success("Translations merged");
        exitSelectionMode();
        fetchTranslations();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to merge");
      }
    } catch {
      toast.error("Failed to merge translations");
    } finally {
      setMerging(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const printItems = selectionMode === "print" ? items.filter((i) => selectedIds.has(i.id)) : [];

  return (
    <div className="space-y-4">
      {/* Screen-only interactive UI */}
      <div className="no-print">
        <div className="flex flex-col sm:flex-row gap-2">
          {selectionMode ? (
            <>
              <div className="flex flex-1 items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex gap-2">
                {selectionMode === "print" ? (
                  <Button
                    size="sm"
                    onClick={handlePrint}
                    disabled={selectedIds.size === 0}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print Selected ({selectedIds.size})
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleMerge}
                    disabled={selectedIds.size < 2 || merging}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    {merging ? "Merging..." : `Merge Selected (${selectedIds.size})`}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={exitSelectionMode}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search translations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "reference", "practice"] as TypeFilter[]).map((t) => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
                {items.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => enterSelectionMode("merge")}>
                      <Merge className="h-4 w-4 mr-1" />
                      Merge
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => enterSelectionMode("print")}>
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {selectedItem && <div className="mt-4"><TranslationDetail item={selectedItem} onClose={() => setSelectedId(null)} /></div>}

        <div className="rounded-md border overflow-x-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                {selectionMode && <TableHead className="w-[40px]" />}
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Translation</TableHead>
                <TableHead className="hidden sm:table-cell">Transliteration</TableHead>
                <TableHead className="hidden md:table-cell">Score</TableHead>
                {!selectionMode && <TableHead className="w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectionMode ? 6 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No saved translations yet. Translate something and click the
                    bookmark icon to save it.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer ${
                      !selectionMode && selectedId === item.id ? "bg-muted/50" : ""
                    } ${selectionMode && selectedIds.has(item.id) ? "bg-muted/50" : ""}`}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(item.id);
                      } else {
                        setSelectedId(selectedId === item.id ? null : item.id);
                      }
                    }}
                  >
                    {selectionMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={item.type === "reference" ? "secondary" : "outline"}
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
                      {item.sourceText}
                    </TableCell>
                    <TableCell>
                      <TargetText className="text-lg">{item.translation}</TargetText>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {item.transliteration}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.type === "practice" && item.score != null && (
                        <Badge
                          variant={item.isCorrect ? "default" : "destructive"}
                        >
                          {item.score}/100
                        </Badge>
                      )}
                    </TableCell>
                    {!selectionMode && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete translation?"
        description={
          <>
            Are you sure you want to delete the translation for{" "}
            <strong>{deleteTarget?.sourceText}</strong>?
          </>
        }
      />

      {/* Print-only cards */}
      <div className="print-only space-y-6">
        {printItems.map((item) => (
          <PrintTranslationCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function PrintTranslationCard({ item }: { item: TranslationItem }) {
  const breakdown = parseBreakdown(item.breakdown);

  return (
    <div className="print-card border rounded-lg p-6 mb-4">
      <p className="text-sm text-muted-foreground mb-1">{item.sourceText}</p>
      <TargetText as="div" className="text-2xl font-bold mb-2">
        {item.translation}
      </TargetText>
      {item.transliteration && (
        <p className="text-base text-muted-foreground mb-3">{item.transliteration}</p>
      )}
      {breakdown.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {breakdown.map((word, i) => (
              <BreakdownCardCompact key={i} item={word} />
            ))}
          </div>
        </div>
      )}
      {item.notes && (
        <p className="text-sm text-muted-foreground mt-3">{item.notes}</p>
      )}
    </div>
  );
}

function TranslationDetail({ item, onClose }: { item: TranslationItem; onClose: () => void }) {
  const breakdown = parseBreakdown(item.breakdown);
  const mistakes = parseMistakes(item.mistakes);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Translation</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Arabic</p>
          <TargetText as="div" className="text-xl sm:text-3xl font-bold">
            {item.translation}
          </TargetText>
        </div>

        {item.transliteration && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Transliteration</p>
            <p className="text-lg">{item.transliteration}</p>
          </div>
        )}

        {breakdown.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Word Breakdown</p>
            <div className="flex flex-wrap gap-2">
              {breakdown.map((word, i) => (
                <BreakdownCard key={i} item={word} />
              ))}
            </div>
          </div>
        )}

        {item.type === "practice" && item.attempt && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your Attempt</p>
            <TargetText className="text-lg">{item.attempt}</TargetText>
            {item.score != null && (
              <Badge
                variant={item.isCorrect ? "default" : "destructive"}
                className="mt-1"
              >
                {item.score}/100
              </Badge>
            )}
          </div>
        )}

        {mistakes.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Mistakes</p>
            <ul className="space-y-1">
              {mistakes.map((m, i) => (
                <li key={i} className="text-sm">
                  <Badge variant="outline" className="mr-1 text-xs">{m.type}</Badge>
                  {m.explanation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.feedback && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Feedback</p>
            <p className="text-sm">{item.feedback}</p>
          </div>
        )}

        {item.notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{item.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
