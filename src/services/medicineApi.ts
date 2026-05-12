import { MedicineAnalysisRequest, MedicineAnalysisResponse } from '../types';
import { analyzeMedicineDirect } from './directMedicineApi';

export async function analyzeMedicine(
  payload: MedicineAnalysisRequest,
): Promise<MedicineAnalysisResponse> {
  return analyzeMedicineDirect(payload);
}
