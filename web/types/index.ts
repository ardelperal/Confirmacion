// Tipos para el sistema de catequesis

export interface SessionFrontMatter {
  code: string;
  title: string;
  module: string;
  duration: number;
  objective: string;
  materials: string[];
  biblical_references: string[];
  catechism_references: string[];
  key_terms: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  // Campos editoriales
  status?: 'draft' | 'published' | 'archived';
  editedBy?: string | null;
  editedAt?: string | null;
  publishedAt?: string | null;
  version?: number;
}

export interface SessionContent {
  frontMatter: SessionFrontMatter;
  content: string;
  htmlContent: string;
}

export interface ModuleInfo {
  code: string;
  title: string;
  description: string;
  order: number;
  sessions: SessionInfo[];
}

export interface SessionInfo {
  code: string;
  title: string;
  duration: number;
}

export interface ModuleContent {
  info: ModuleInfo;
  sessions: SessionContent[];
}

export interface ParsedMarkdown {
  frontMatter: Record<string, any>;
  content: string;
  htmlContent: string;
}

// Configuración del curso
export interface CourseConfig {
  modules: ModuleInfo[];
  settings: {
    default_duration: number;
    total_sessions: number;
    target_age: string;
    course_name: string;
  };
}

// Tipos para la navegación
export interface NavigationItem {
  code: string;
  title: string;
  type: 'module' | 'session';
  href: string;
  children?: NavigationItem[];
}

// Tipos para autenticación
export interface AuthUser {
  id: string;
  username: string;
  role: 'admin';
}

// Tipos para auditoría
export interface AuditLogEntry {
  ts: string;
  user: string;
  action: 'save' | 'publish' | 'unpublish' | 'delete';
  code: string;
  version: number;
}

// Configuración de entorno
export interface AppConfig {
  adminPasswordHash?: string;
  adminPassword?: string;
  jwtSecret: string;
  readOnly: boolean;
  visibilityMode: 'publish' | 'edited';
}