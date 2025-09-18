import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_PASSWORD_HASH_EXISTS: !!hash,
    ADMIN_PASSWORD_HASH_LENGTH: hash?.length || 0,
    ADMIN_PASSWORD_HASH_STARTS_WITH_DOLLAR: hash?.startsWith('$') || false,
    ADMIN_PASSWORD_HASH_FIRST_10_CHARS: hash?.substring(0, 10) || '',
    ADMIN_PASSWORD_HASH_RAW: hash || '',
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    READ_ONLY: process.env.READ_ONLY,
    VISIBILITY_MODE: process.env.VISIBILITY_MODE,
  });
}