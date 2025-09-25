import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { resolveContentPath, writeContentFile, readContentFile } from '@/lib/fsSafe';

type FrontMatterRecord = Record<string, unknown>;

const FRONT_MATTER_REGEX = /^\uFEFF?---[\s\S]*?\r?\n---[^\n\r]*\r?\n?/;

function stripFrontMatter(raw: string): string {
  if (!raw) {
    return raw;
  }
  const match = raw.match(FRONT_MATTER_REGEX);
  if (!match) {
    return raw;
  }
  return raw.slice(match[0].length);
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { code, markdown } = await request.json();

    if (!code || !code.match(/^[A-F][1-4]$/)) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    if (!markdown) {
      return NextResponse.json(
        { error: 'Contenido requerido' },
        { status: 400 }
      );
    }

    const relativePath = `${code}.md`;
    const targetFile = resolveContentPath('sessions', relativePath);

    let parsedFrontMatter: FrontMatterRecord = {};
    let contentBody = markdown;
    let parsedSuccessfully = false;

    try {
      const parsed = matter(markdown);
      parsedFrontMatter = (parsed.data as FrontMatterRecord) || {};
      contentBody = parsed.content;
      parsedSuccessfully = true;
    } catch (parseError) {
      console.warn('Error parsing front matter, falling back to existing metadata', parseError);
    }

    let baseFrontMatter: FrontMatterRecord = {};

    try {
      const existingRaw = await readContentFile('sessions', relativePath);
      const existingParsed = matter(existingRaw);
      baseFrontMatter = (existingParsed.data as FrontMatterRecord) || {};
      if (!parsedSuccessfully) {
        contentBody = stripFrontMatter(markdown);
      }
    } catch (loadError) {
      console.warn(`No existing metadata found for ${code} (${targetFile}), continuing with defaults`, loadError);
      if (!parsedSuccessfully) {
        contentBody = stripFrontMatter(markdown);
      }
    }

    const baseVersion = Number((baseFrontMatter as any).version) || 0;
    const incomingVersion = Number((parsedFrontMatter as any).version) || baseVersion;
    const version = Math.max(baseVersion, incomingVersion) + 1;

    const now = new Date().toISOString();
    const status = (parsedFrontMatter as any).status || (baseFrontMatter as any).status || 'draft';

    const finalFrontMatter = {
      ...baseFrontMatter,
      ...parsedFrontMatter,
      code,
      version,
      editedBy: 'parroco',
      editedAt: now,
      status
    };

    const sanitizedContent = parsedSuccessfully ? contentBody : stripFrontMatter(contentBody);
    const updatedMarkdown = matter.stringify(sanitizedContent, finalFrontMatter);

    await writeContentFile(updatedMarkdown, 'sessions', relativePath);

    await logAudit({
      ts: now,
      user: 'parroco',
      action: 'save',
      code,
      version
    });

    return NextResponse.json({
      ok: true,
      version,
      message: 'Sesión guardada exitosamente'
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function logAudit(entry: {
  ts: string;
  user: string;
  action: string;
  code: string;
  version: number;
}) {
  try {
    const auditPath = resolveContentPath('.audit.log');
    const contentDir = path.dirname(auditPath);

    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(auditPath, logLine, 'utf8');
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
