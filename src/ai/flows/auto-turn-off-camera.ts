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
  videoFrameDataUri: z
    .string()
    .describe(
      "A single frame from a video feed as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  referencePhotoDataUri: z
    .string()
    .describe(
      "A reference photo of the person to detect, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectPersonAndTurnOffCameraInput = z.infer<typeof DetectPersonAndTurnOffCameraInputSchema>;

const DetectPersonAndTurnOffCameraOutputSchema = z.object({
  personDetected: z
    .boolean()
    .describe('Whether or not the person from the reference photo is detected in the video frame.'),
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
  prompt: `You are an AI assistant that analyzes a video frame to determine if a specific person is present.

  You will be given a reference photo of the person to look for.
  Reference Photo: {{media url=referencePhotoDataUri}}

  You will also be given a frame from a video feed.
  Video Frame: {{media url=videoFrameDataUri}}

  Compare the video frame to the reference photo. Determine if the person from the reference photo is present in the video frame.
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
