import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase().replace(/\.html$/, '');

  if (!/^[a-z0-9_-]+$/.test(normalizedSlug)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const filePath = path.resolve(
    process.cwd(),
    '..',
    'public',
    'recursos',
    'catequesis',
    'fichas',
    `${normalizedSlug}.html`
  );

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Ficha not found:', normalizedSlug, error);
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
}
