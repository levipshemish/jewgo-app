import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('[DB INFO] Starting database info request...');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'unknown',
      tables: [],
      connection_info: {}
    };

    // Test database connection
    try {
      console.log('[DB INFO] Testing database connection...');
      await prisma.$connect();
      result.database = 'connected';
      
      // Get database connection info
      const connectionInfo = await prisma.$queryRaw`
        SELECT 
          current_database() as database_name,
          current_user as current_user,
          version() as postgres_version
      `;
      result.connection_info = connectionInfo;
      
      // Get list of all tables in the public schema
      console.log('[DB INFO] Getting table list...');
      const tables = await prisma.$queryRaw`
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      
      result.tables = tables;
      console.log('[DB INFO] Found tables:', tables.length);

      // Try to get some basic info about each table
      const tableInfo = [];
      for (const table of tables) {
        try {
          const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "${table.table_name}"`;
          tableInfo.push({
            name: table.table_name,
            type: table.table_type,
            row_count: count[0]?.count || 0
          });
        } catch (error) {
          tableInfo.push({
            name: table.table_name,
            type: table.table_type,
            row_count: 'error',
            error: String(error)
          });
        }
      }
      result.table_info = tableInfo;
      
      await prisma.$disconnect();
      console.log('[DB INFO] Database disconnected');
      
    } catch (dbError) {
      console.error('[DB INFO] Database error:', dbError);
      result.database = 'error';
      result.database_error = String(dbError);
    }

    console.log('[DB INFO] Database info result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[DB INFO] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to get database info',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
