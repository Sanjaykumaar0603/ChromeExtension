'use server';

/**
 * @fileOverview An AI agent to determine if the microphone should be muted based on voice detection.
 *
 * - analyzeAudioAndMute - A function that analyzes audio input and determines if the microphone should be muted.
 * - AnalyzeAudioAndMuteInput - The input type for the analyzeAudioAndMute function.
 * - AnalyzeAudioAndMuteOutput - The return type for the analyzeAudioAndMute function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAudioAndMuteInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A short audio clip as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeAudioAndMuteInput = z.infer<typeof AnalyzeAudioAndMuteInputSchema>;

const AnalyzeAudioAndMuteOutputSchema = z.object({
  voiceDetected: z.boolean().describe('Whether or not voice was detected in the audio clip.'),
});
export type AnalyzeAudioAndMuteOutput = z.infer<typeof AnalyzeAudioAndMuteOutputSchema>;

export async function analyzeAudioAndMute(input: AnalyzeAudioAndMuteInput): Promise<AnalyzeAudioAndMuteOutput> {
  return analyzeAudioAndMuteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAudioAndMutePrompt',
  input: {schema: AnalyzeAudioAndMuteInputSchema},
  output: {schema: AnalyzeAudioAndMuteOutputSchema},
  prompt: `You are an AI assistant that analyzes audio to detect human speech.
  Analyze the provided audio clip.
  Audio: {{media url=audioDataUri}}
  Determine if human speech is present in the audio.
  Return a JSON object with a single boolean field "voiceDetected". Set it to true if speech is detected, otherwise set it to false.
  `,
});

const analyzeAudioAndMuteFlow = ai.defineFlow(
  {
    name: 'analyzeAudioAndMuteFlow',
    inputSchema: AnalyzeAudioAndMuteInputSchema,
    outputSchema: AnalyzeAudioAndMuteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
