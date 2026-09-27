import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// File-based store for local and serverless persistence fallback
const SYNC_CACHE = new Map<string, any>();
const DATA_DIR = path.join(process.cwd(), '.sync-data');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // Ignore in read-only environments
  }
}

function getSyncFilePath(code: string): string {
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeCode}.json`);
}

function readSyncData(code: string) {
  if (SYNC_CACHE.has(code)) {
    return SYNC_CACHE.get(code);
  }
  try {
    const filePath = getSyncFilePath(code);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      SYNC_CACHE.set(code, data);
      return data;
    }
  } catch (e) {
    console.error('Error reading sync file:', e);
  }
  return null;
}

function writeSyncData(code: string, data: any) {
  SYNC_CACHE.set(code, data);
  try {
    ensureDataDir();
    const filePath = getSyncFilePath(code);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // In strict read-only serverless, in-memory cache still holds state during lifecycle
    console.warn('Could not persist sync file to disk:', e);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').toUpperCase().trim();

  if (!code) {
    return NextResponse.json({ error: 'Falta el código de sincronización' }, { status: 400 });
  }

  const data = readSyncData(code);
  if (!data) {
    return NextResponse.json({ found: false, message: 'No hay datos guardados para este código todavía' }, { status: 404 });
  }

  return NextResponse.json({ found: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = (body.syncCode || body.code || '').toUpperCase().trim();

    if (!code) {
      return NextResponse.json({ error: 'Falta el código de sincronización' }, { status: 400 });
    }

    const payload = {
      ...body,
      syncCode: code,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now(),
    };

    writeSyncData(code, payload);

    return NextResponse.json({
      success: true,
      message: 'Datos sincronizados correctamente en la nube',
      timestamp: payload.timestamp,
    });
  } catch (error: any) {
    console.error('Error saving sync data:', error);
    return NextResponse.json({ error: error.message || 'Error al sincronizar' }, { status: 500 });
  }
}
