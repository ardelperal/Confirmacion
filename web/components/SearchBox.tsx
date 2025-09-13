'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Fuse from 'fuse.js';
import { SessionContent } from '@/types';
import Link from 'next/link';

interface SearchResult {
  item: SessionContent;
  score?: number;
  matches?: Fuse.FuseResultMatch[];
}

interface SearchBoxProps {
  sessions: SessionContent[];
  placeholder?: string;
  maxResults?: number;
  className?: string;
}

export default function SearchBox({ 
  sessions, 
  placeholder = "Buscar sesiones...", 
  maxResults = 10,
  className = '' 
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Configuración de Fuse.js
  const fuse = new Fuse(sessions, {
    keys: [
      { name: 'frontMatter.title', weight: 0.3 },
      { name: 'frontMatter.code', weight: 0.2 },
      { name: 'frontMatter.objective', weight: 0.2 },
      { name: 'content', weight: 0.15 },
      { name: 'frontMatter.biblical_references', weight: 0.1 },
      { name: 'frontMatter.key_terms', weight: 0.05 }
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2
  });

  // Realizar búsqueda
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = fuse.search(query, { limit: maxResults });
    setResults(searchResults);
    setIsOpen(true);
    setSelectedIndex(-1);
  }, [query, maxResults]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedResult = results[selectedIndex];
          window.location.href = `/session/${selectedResult.item.frontMatter.code}`;
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, matches?: Fuse.FuseResultMatch[]) => {
    if (!matches || matches.length === 0) return text;
    
    // Simplificado: solo resaltar la primera coincidencia
    const match = matches[0];
    if (!match.indices || match.indices.length === 0) return text;
    
    const [start, end] = match.indices[0];
    return (
      <>
        {text.substring(0, start)}
        <mark className="bg-yellow-200 px-1 rounded">
          {text.substring(start, end + 1)}
        </mark>
        {text.substring(end + 1)}
      </>
    );
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Input de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Resultados de búsqueda */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {results.map((result, index) => {
            const { item, matches } = result;
            const isSelected = index === selectedIndex;
            
            return (
              <Link
                key={item.frontMatter.code}
                href={`/session/${item.frontMatter.code}`}
                className={`block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {item.frontMatter.code}
                      </span>
                      <span className="text-xs text-gray-500">
                        Módulo {item.frontMatter.module}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {highlightMatch(item.frontMatter.title, matches?.filter(m => m.key === 'frontMatter.title'))}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {highlightMatch(item.frontMatter.objective, matches?.filter(m => m.key === 'frontMatter.objective'))}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {item.frontMatter.duration} min
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* No hay resultados */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-3 text-base ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-2 text-sm text-gray-500 text-center">
            No se encontraron resultados para "{query}"
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para búsqueda programática
export function useSearch(sessions: SessionContent[]) {
  const [fuse] = useState(() => new Fuse(sessions, {
    keys: [
      { name: 'frontMatter.title', weight: 0.3 },
      { name: 'frontMatter.code', weight: 0.2 },
      { name: 'frontMatter.objective', weight: 0.2 },
      { name: 'content', weight: 0.15 },
      { name: 'frontMatter.biblical_references', weight: 0.1 },
      { name: 'frontMatter.key_terms', weight: 0.05 }
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true
  }));

  const search = (query: string, limit = 10) => {
    if (query.trim().length < 2) return [];
    return fuse.search(query, { limit });
  };

  return { search };
}