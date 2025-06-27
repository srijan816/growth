import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PrimaryFeedbackData, SecondaryFeedbackData } from './ai-feedback-generator';

export interface DocumentGenerationOptions {
  outputPath?: string;
  templateStyle?: 'standard' | 'modern' | 'minimal';
  includeMetadata?: boolean;
  includeConfidenceMetrics?: boolean;
}

export class DocumentGenerator {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || join(process.cwd(), 'generated-documents');
    // Ensure output directory exists
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create output directory:', error);
    }
  }

  /**
   * Generate Primary Feedback Document (Elementary Level)
   */
  async generatePrimaryFeedbackDocument(
    feedbackData: PrimaryFeedbackData,
    options: DocumentGenerationOptions = {}
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
            
            // Student name
            new Paragraph({
              children: [
                new TextRun({
                  text: `Student: ${feedbackData.studentName}`,
                  font: 'Courier New',
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            // Header separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Topic separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            // Topic
            new Paragraph({
              children: [
                new TextRun({
                  text: `Topic: ${feedbackData.topic}`,
                  font: 'Courier New',
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            // Topic separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Teacher observations header
            new Paragraph({
              children: [
                new TextRun({
                  text: "My Teacher's Observations and Feedback",
                  font: 'Arial',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 300 },
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Create feedback table
            this.createPrimaryFeedbackTable(feedbackData),
            
            // Metadata (if included)
            ...(options.includeMetadata ? this.createMetadataSection(feedbackData) : []),
          ],
        }],
      });

      const fileName = `${feedbackData.studentName.replace(/\s+/g, '_')}_Primary_Feedback_${Date.now()}.docx`;
      const filePath = join(this.outputDir, fileName);
      
      const buffer = await Packer.toBuffer(doc);
      writeFileSync(filePath, buffer);

      return { success: true, filePath };
    } catch (error) {
      console.error('Error generating primary feedback document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Document generation failed' 
      };
    }
  }

  /**
   * Generate Secondary Feedback Document (Middle/High School Level)
   */
  async generateSecondaryFeedbackDocument(
    feedbackData: SecondaryFeedbackData,
    options: DocumentGenerationOptions = {}
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
            
            // Student name
            new Paragraph({
              children: [
                new TextRun({
                  text: `Student Name: ${feedbackData.studentName}`,
                  font: 'Courier New',
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            // Header separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Motion separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            // Motion
            new Paragraph({
              children: [
                new TextRun({
                  text: `Motion: ${feedbackData.motion}`,
                  font: 'Courier New',
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            // Motion separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '-----------------------------------------------------------------------',
                  font: 'Courier New',
                }),
              ],
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Create rubric table
            this.createSecondaryRubricTable(feedbackData),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
            
            // Teacher comments
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Teacher comments:',
                  font: 'Arial',
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: feedbackData.teacherComments,
                  font: 'Arial',
                }),
              ],
              spacing: { after: 300 },
            }),
            
            // Metadata (if included)
            ...(options.includeMetadata ? this.createMetadataSection(feedbackData) : []),
          ],
        }],
      });

      const fileName = `${feedbackData.studentName.replace(/\s+/g, '_')}_Secondary_Feedback_${Date.now()}.docx`;
      const filePath = join(this.outputDir, fileName);
      
      const buffer = await Packer.toBuffer(doc);
      writeFileSync(filePath, buffer);

      return { success: true, filePath };
    } catch (error) {
      console.error('Error generating secondary feedback document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Document generation failed' 
      };
    }
  }

  /**
   * Create primary feedback table
   */
  private createPrimaryFeedbackTable(feedbackData: PrimaryFeedbackData): Table {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'What was the BEST thing about my speech?',
                      bold: true,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: this.getTableBorders(),
            }),
            new TableCell({
              children: [
                ...feedbackData.strengths.map(strength => 
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `• ${strength}`,
                        font: 'Arial',
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                ),
              ],
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: this.getTableBorders(),
            }),
          ],
        }),
        
        // Improvement row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'What part of my speech NEEDS IMPROVEMENT?',
                      bold: true,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
              borders: this.getTableBorders(),
            }),
            new TableCell({
              children: [
                ...feedbackData.improvements.map(improvement => 
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `• ${improvement}`,
                        font: 'Arial',
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                ),
              ],
              borders: this.getTableBorders(),
            }),
          ],
        }),
      ],
    });
  }

  /**
   * Create secondary rubric table
   */
  private createSecondaryRubricTable(feedbackData: SecondaryFeedbackData): Table {
    const rubricItems = [
      'Student spoke for the duration of specified time frame.',
      'Student offered/accepted point of information',
      'Student spoke in stylistic/persuasive manner',
      'Student\'s argument is complete (Claims/Evidence)',
      'Student argument reflects theory application',
      'Student\'s rebuttal is effective',
      'Student ably supported teammate',
      'Student applied feedback from previous debates',
    ];

    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '', font: 'Arial' })] })],
          width: { size: 60, type: WidthType.PERCENTAGE },
          borders: this.getTableBorders(),
        }),
        ...['N/A', '1', '2', '3', '4', '5'].map(score => 
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: score,
                    bold: true,
                    font: 'Arial',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 7, type: WidthType.PERCENTAGE },
            borders: this.getTableBorders(),
          })
        ),
      ],
    });

    const rubricRows = rubricItems.map((item, index) => {
      const rubricKey = `rubric_${index + 1}` as keyof typeof feedbackData.rubricScores;
      const score = feedbackData.rubricScores[rubricKey];
      
      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
            borders: this.getTableBorders(),
          }),
          ...['0', '1', '2', '3', '4', '5'].map((scoreValue, scoreIndex) => {
            const isSelected = score === parseInt(scoreValue);
            return new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: isSelected ? 'X' : '',
                      bold: isSelected,
                      font: 'Arial',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              borders: this.getTableBorders(),
            });
          }),
        ],
      });
    });

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [headerRow, ...rubricRows],
    });
  }

  /**
   * Create metadata section
   */
  private createMetadataSection(feedbackData: PrimaryFeedbackData | SecondaryFeedbackData): Paragraph[] {
    return [
      new Paragraph({ children: [new TextRun({ text: '' })] }), // Empty line
      new Paragraph({
        children: [
          new TextRun({
            text: '--- AI Generated Feedback Metadata ---',
            font: 'Arial',
            size: 16,
            color: '666666',
            italics: true,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleString()}`,
            font: 'Arial',
            size: 16,
            color: '666666',
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Speech Duration: ${feedbackData.speechDuration}`,
            font: 'Arial',
            size: 16,
            color: '666666',
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Instructor: ${feedbackData.instructor}`,
            font: 'Arial',
            size: 16,
            color: '666666',
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Transcription Confidence: ${Math.round(feedbackData.transcriptionConfidence * 100)}%`,
            font: 'Arial',
            size: 16,
            color: '666666',
          }),
        ],
      }),
    ];
  }

  /**
   * Get table border configuration
   */
  private getTableBorders() {
    return {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    };
  }

  /**
   * Generate batch documents for multiple feedbacks
   */
  async generateBatchDocuments(
    feedbacks: Array<{
      type: 'primary' | 'secondary';
      data: PrimaryFeedbackData | SecondaryFeedbackData;
    }>,
    options: DocumentGenerationOptions = {}
  ): Promise<{
    success: boolean;
    results: Array<{ success: boolean; filePath?: string; error?: string; studentName: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const feedback of feedbacks) {
      try {
        let result;
        if (feedback.type === 'primary') {
          result = await this.generatePrimaryFeedbackDocument(
            feedback.data as PrimaryFeedbackData, 
            options
          );
        } else {
          result = await this.generateSecondaryFeedbackDocument(
            feedback.data as SecondaryFeedbackData, 
            options
          );
        }

        results.push({
          ...result,
          studentName: feedback.data.studentName,
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          studentName: feedback.data.studentName,
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: {
        total: feedbacks.length,
        successful,
        failed,
      },
    };
  }
}

// Export singleton instance
export const documentGenerator = new DocumentGenerator();