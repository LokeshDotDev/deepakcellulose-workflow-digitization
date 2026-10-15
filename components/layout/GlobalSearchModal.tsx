"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  category: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
}

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent can toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search POs, Gate Entries, GRNs, Lots, QC Tests, BMR Batches, Challans..."
            className="w-full text-sm outline-none text-slate-800 placeholder:text-slate-400"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching records found for <span className="font-semibold text-slate-700">"{query}"</span>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 px-4 text-center text-xs text-slate-400 space-y-1">
              <p>Type at least 2 characters to search across all manufacturing ERP modules.</p>
              <p className="text-[11px] text-slate-400">Quick tip: Search by "PO", "GE", "GRN", "LOT", "BMR", or supplier name.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r.href)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition text-left group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{r.category}</span>
                      <Badge status={r.status} />
                    </div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition">
                      {r.title}
                    </div>
                    <div className="text-xs text-slate-500">{r.subtitle}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">ESC</kbd> to close</span>
          <span>Deepak Cellulose Global Index</span>
        </div>
      </div>
    </div>
  );
}
