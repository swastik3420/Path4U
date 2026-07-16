import { supabase } from "@/integrations/supabase/client";
// Use the legacy build for broader mobile Safari / WebKit compatibility.
// The modern build relies on async iterators over ReadableStream, which
// crashes on iOS Safari with: "undefined is not a function (near '...i of n...')".
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Match the worker to the exact version of the library to avoid API mismatches.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedSkill {
  name: string;
  category: string;
  proficiencyHint?: string;
}

export interface ParsedResume {
  skills: ParsedSkill[];
  experienceLevel: string;
  jobTitles: string[];
  industries: string[];
  summary: string;
}

export interface Question {
  id: number;
  skill: string;
  difficulty: "Basic" | "Intermediate" | "Advanced";
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse resume text using AI to extract skills and profile information
 */
export async function parseResume(resumeText: string): Promise<ApiResponse<ParsedResume>> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: { resumeText }
    });

    if (error) {
      console.error('Error parsing resume:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to parse resume' };
    }

    return { success: true, data: data.data };
  } catch (err) {
    console.error('Error in parseResume:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Generate assessment questions based on extracted skills
 */
export async function generateQuestions(
  skills: ParsedSkill[],
  experienceLevel: string,
  count?: number
): Promise<ApiResponse<Question[]>> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-questions', {
      body: { skills, experienceLevel, count }
    });

    if (error) {
      console.error('Error generating questions:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to generate questions' };
    }

    return { success: true, data: data.questions };
  } catch (err) {
    console.error('Error in generateQuestions:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Extract text from a PDF file using pdf.js for reliable parsing
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Pass a Uint8Array (not a stream) so pdf.js never falls back to async
  // iteration over a ReadableStream — which is unsupported on mobile Safari.
  const data = new Uint8Array(arrayBuffer);

  const pdf = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    
  }).promise;

  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Reconstruct text using item positions so spacing/newlines are preserved
    let pageText = '';
    let lastY: number | null = null;
    let lastEndX: number | null = null;
    let lastHeight = 0;

    for (const item of textContent.items as any[]) {
      const str: string = item.str ?? '';
      if (!str && !item.hasEOL) continue;

      const tx = item.transform || [1, 0, 0, 1, 0, 0];
      const x = tx[4];
      const y = tx[5];
      const width = item.width ?? 0;
      const height = item.height ?? Math.abs(tx[3]) ?? 10;

      if (lastY !== null) {
        const yDelta = Math.abs(y - lastY);
        if (yDelta > Math.max(2, lastHeight * 0.6)) {
          // New visual line
          pageText += yDelta > lastHeight * 1.8 ? '\n\n' : '\n';
          lastEndX = null;
        } else if (lastEndX !== null && x - lastEndX > Math.max(1, height * 0.25)) {
          if (!pageText.endsWith(' ') && !pageText.endsWith('\n')) pageText += ' ';
        }
      }

      pageText += str;
      if (item.hasEOL) {
        pageText += '\n';
        lastEndX = null;
      } else {
        lastEndX = x + width;
      }
      lastY = y;
      lastHeight = height || lastHeight;
    }

    // Cleanup: collapse spaces, normalize newlines
    pageText = pageText
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    if (pageText) pageTexts.push(pageText);
  }

  const fullText = pageTexts.join('\n\n').trim();

  if (fullText.length < 30) {
    throw new Error(
      'Could not extract text from this PDF. It may be a scanned/image-based PDF or encrypted. Please try a text-based PDF, or upload your resume as .txt or .md.'
    );
  }

  console.log(`Extracted ${fullText.length} characters from ${numPages} page(s)`);
  return fullText;
}

/**
 * Extract text from a plain text or markdown file
 */
export async function extractTextFromTextFile(file: File): Promise<string> {
  return await file.text();
}

/**
 * Determine file type and extract text accordingly
 */
export async function extractResumeText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return extractTextFromPdf(file);
    case 'txt':
    case 'md':
      return extractTextFromTextFile(file);
    default:
      throw new Error(`Unsupported file format: .${extension}. Please upload a PDF or TXT file.`);
  }
}
