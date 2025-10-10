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
  voiceDetectionThreshold: z.number().describe('The sensitivity threshold for voice detection (0-1).'),
  muteDuration: z.number().describe('The duration (in seconds) to wait before muting after voice is no longer detected.'),
});
export type AnalyzeAudioAndMuteInput = z.infer<typeof AnalyzeAudioAndMuteInputSchema>;

const AnalyzeAudioAndMuteOutputSchema = z.object({
  shouldMute: z.boolean().describe('Whether the microphone should be muted based on voice detection.'),
});
export type AnalyzeAudioAndMuteOutput = z.infer<typeof AnalyzeAudioAndMuteOutputSchema>;

export async function analyzeAudioAndMute(input: AnalyzeAudioAndMuteInput): Promise<AnalyzeAudioAndMuteOutput> {
  return analyzeAudioAndMuteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAudioAndMutePrompt',
  input: {schema: AnalyzeAudioAndMuteInputSchema},
  output: {schema: AnalyzeAudioAndMuteOutputSchema},
  prompt: `You are an AI assistant that analyzes audio input to determine if the microphone should be muted. You will receive an audio clip as a data URI, a voice detection threshold, and a mute duration.

  Analyze the audio clip and determine if voice is present. Use the voice detection threshold to adjust the sensitivity of voice detection. If voice is not detected for the specified mute duration, then you should recommend that the microphone be muted.

  Audio: {{media url=audioDataUri}}
  Voice Detection Threshold: {{{voiceDetectionThreshold}}}
  Mute Duration: {{{muteDuration}}}

  Return a JSON object with a single boolean field called "shouldMute". Set "shouldMute" to true if the microphone should be muted; otherwise, set it to false.
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
