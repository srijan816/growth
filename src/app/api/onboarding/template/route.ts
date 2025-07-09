import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as XLSX from 'xlsx';
import { authOptions } from '@/lib/auth';
import { generateExcelTemplate } from '@/lib/onboarding/excel-parser';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'courses' | 'enrollments' | 'lessons';

    if (!type || !['courses', 'enrollments', 'lessons'].includes(type)) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    // Generate template
    const templateData = generateExcelTemplate(type);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Add column widths for better readability
    const colWidths = Object.keys(templateData[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${type}_template.xlsx"`
      }
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}