import { MedicineAnalysisRequest, MedicineAnalysisResponse } from '../types';
import { getApiUrl } from '../utils/getApiUrl';

export async function analyzeMedicine(
  payload: MedicineAnalysisRequest,
): Promise<MedicineAnalysisResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/analyze-medicine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { content: '', error: errorText || 'Request failed' };
    }

    const data = await response.json();
    return {
      content: data.content,
      action: data.action,
      is_emergency: data.is_emergency,
      identifiedMedicine: data.identifiedMedicine,
      confidence: data.confidence,
    };
  } catch {
    return { content: '', error: 'Network error. Please try again.' };
  }
}
