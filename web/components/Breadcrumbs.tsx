'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {/* Home link */}
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Inicio
          </Link>
        </li>
        
        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1" />
              {item.href && !item.current ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors md:ml-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Utility functions for common breadcrumb patterns
export function getSessionBreadcrumbs(sessionCode: string, sessionTitle: string, moduleCode: string, moduleTitle: string): BreadcrumbItem[] {
  return [
    {
      label: `Módulo ${moduleCode}`,
      href: `/module/${moduleCode}`
    },
    {
      label: `${sessionCode}: ${sessionTitle}`,
      current: true
    }
  ];
}

export function getModuleBreadcrumbs(moduleCode: string, moduleTitle: string): BreadcrumbItem[] {
  return [
    {
      label: `Módulo ${moduleCode}: ${moduleTitle}`,
      current: true
    }
  ];
}

export function getSearchBreadcrumbs(query: string): BreadcrumbItem[] {
  return [
    {
      label: `Búsqueda: "${query}"`,
      current: true
    }
  ];
}