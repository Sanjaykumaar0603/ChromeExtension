'use server';

/**
 * @fileOverview Automatically turns off the camera when the logged-in person is not detected in the video feed.
 *
 * - detectPersonAndTurnOffCamera - A function that handles the detection of a person in the video feed and turns off the camera if the person is not detected.
 * - DetectPersonAndTurnOffCameraInput - The input type for the detectPersonAndTurnOffCamera function.
 * - DetectPersonAndTurnOffCameraOutput - The return type for the detectPersonAndTurnOffCamera function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectPersonAndTurnOffCameraInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video feed as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  loggedInPersonDescription: z
    .string()
    .describe('A description of the logged-in person for identification.'),
});
export type DetectPersonAndTurnOffCameraInput = z.infer<typeof DetectPersonAndTurnOffCameraInputSchema>;

const DetectPersonAndTurnOffCameraOutputSchema = z.object({
  personDetected: z
    .boolean()
    .describe('Whether or not the logged-in person is detected in the video feed.'),
});
export type DetectPersonAndTurnOffCameraOutput = z.infer<typeof DetectPersonAndTurnOffCameraOutputSchema>;

export async function detectPersonAndTurnOffCamera(
  input: DetectPersonAndTurnOffCameraInput
): Promise<DetectPersonAndTurnOffCameraOutput> {
  return detectPersonAndTurnOffCameraFlow(input);
}

const detectPersonAndTurnOffCameraPrompt = ai.definePrompt({
  name: 'detectPersonAndTurnOffCameraPrompt',
  input: {schema: DetectPersonAndTurnOffCameraInputSchema},
  output: {schema: DetectPersonAndTurnOffCameraOutputSchema},
  prompt: `You are an AI assistant that analyzes a video feed and determines if the logged-in person is present.

  Description of logged-in person: {{{loggedInPersonDescription}}}
  Video Feed: {{media url=videoDataUri}}

  Based on the video feed and the description of the logged-in person, determine if the person is present in the video feed.
  Return true if the person is present, and false if the person is not present.
  Set the personDetected output field accordingly.
  `,
});

const detectPersonAndTurnOffCameraFlow = ai.defineFlow(
  {
    name: 'detectPersonAndTurnOffCameraFlow',
    inputSchema: DetectPersonAndTurnOffCameraInputSchema,
    outputSchema: DetectPersonAndTurnOffCameraOutputSchema,
  },
  async input => {
    const {output} = await detectPersonAndTurnOffCameraPrompt(input);
    return output!;
  }
);
