'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Fuse, { FuseResult } from 'fuse.js';

interface SessionSummary {
  code: string;
  title: string;
  module: string;
  status: string;
  bible: string[];
  cic: string[];
}

interface SearchResult {
  item: SessionSummary;
  matches?: FuseResult<SessionSummary>['matches'];
}

interface SearchBoxProps {
  placeholder?: string;
  className?: string;
}

export function SearchBox({ 
  placeholder = "Buscar sesiones por tema, código o contenido...", 
  className = '' 
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [fuse, setFuse] = useState<Fuse<SessionSummary> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Configuración de Fuse.js
  const fuseOptions = {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'code', weight: 0.3 },
      { name: 'bible', weight: 0.15 },
      { name: 'cic', weight: 0.15 }
    ],
    threshold: 0.3,
    includeMatches: true,
    includeScore: true,
    minMatchCharLength: 2
  };

  // Cargar datos del índice al montar el componente
  useEffect(() => {
    const loadSearchIndex = async () => {
      try {
        const response = await fetch('/api/index.json');
        const data = await response.json();
        if (data.success) {
          setSessions(data.data);
          setFuse(new Fuse(data.data, fuseOptions));
        }
      } catch (error) {
        console.error('Error loading search index:', error);
      }
    };

    loadSearchIndex();
  }, []);

  // Manejar búsqueda
  useEffect(() => {
    if (!query.trim() || !fuse) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    const searchResults = fuse.search(query.trim()).slice(0, 8);
    setResults(searchResults);
    setShowResults(true);
    setIsLoading(false);
  }, [query, fuse]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para resaltar coincidencias
  const highlightMatch = (text: string, matches?: FuseResult<SessionSummary>['matches']) => {
    if (!matches || matches.length === 0) return text;

    let highlightedText = text;
    const sortedMatches = matches
      .filter(match => match.key === 'title' || match.key === 'code')
      .sort((a, b) => (b.indices[0]?.[0] || 0) - (a.indices[0]?.[0] || 0));

    sortedMatches.forEach(match => {
      match.indices.forEach(([start, end]) => {
        const before = highlightedText.slice(0, start);
        const highlighted = highlightedText.slice(start, end + 1);
        const after = highlightedText.slice(end + 1);
        highlightedText = before + `<mark class="bg-yellow-200 px-1 rounded">${highlighted}</mark>` + after;
      });
    });

    return highlightedText;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          onFocus={() => query && setShowResults(true)}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {showResults && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <Link
                  key={result.item.code}
                  href={`/sesion/${result.item.code.toLowerCase()}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {result.item.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          Módulo {result.item.module}
                        </span>
                      </div>
                      <h4 
                        className="text-sm font-medium text-gray-900 leading-tight"
                        dangerouslySetInnerHTML={{
                          __html: highlightMatch(result.item.title, result.matches)
                        }}
                      />
                      {result.item.bible.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {result.item.bible.slice(0, 3).map((ref, i) => (
                            <span key={i} className="text-xs text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                              {ref}
                            </span>
                          ))}
                          {result.item.bible.length > 3 && (
                            <span className="text-xs text-gray-500">+{result.item.bible.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-gray-500 text-center text-sm">
              {isLoading ? 'Buscando...' : 'No se encontraron resultados'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}