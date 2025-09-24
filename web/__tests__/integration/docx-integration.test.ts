import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-docx'))
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER',
    JUSTIFIED: 'JUSTIFIED'
  },
  PageBreak: jest.fn()
}));

import { getSession } from '@/lib/content-loader';
import { Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as unknown as { toBuffer: jest.Mock };

const { cookies } = require('next/headers');

describe('DOCX Integration', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'B',
    duration: 45,
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  } as any;

  const defaultContent = `# Título\n\n- Item 1\n- Item 2\n\n---pagebreak---\n\n## Subtítulo`;

  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    } as any,
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML</p>'
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cookies.mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });
  });

  it('returns 200 and DOCX for published session', async () => {
    mockGetSession.mockResolvedValue(createSession());

    const req = new NextRequest('http://localhost:3000/api/export/docx/b2');
    const res = await GET(req, { params: Promise.resolve({ code: 'b2' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('officedocument');
  });

  it('blocks adminPreview when not admin', async () => {
    mockGetSession.mockResolvedValue(createSession());
    const req = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const res = await GET(req, { params: Promise.resolve({ code: 'b2' }) });
    expect(res.status).toBe(403);
  });

  it('handles DOCX generation errors gracefully', async () => {
    mockGetSession.mockResolvedValue(createSession());
    mockPacker.toBuffer.mockRejectedValueOnce(new Error('boom'));

    const req = new NextRequest('http://localhost:3000/api/export/docx/b2');
    const res = await GET(req, { params: Promise.resolve({ code: 'b2' }) });
    expect(res.status).toBe(500);
  });
});

