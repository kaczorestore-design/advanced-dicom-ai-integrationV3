import { MeasurementMetadata, SUVCalculation } from '../components/measurements/AdvancedMeasurements';

// SUV calculation utilities for PET imaging

// Radiopharmaceutical data
interface Radiopharmaceutical {
  name: string;
  halfLife: number; // minutes
  decayConstant: number; // 1/min
  branchingRatio: number;
}

const RADIOPHARMACEUTICALS: Record<string, Radiopharmaceutical> = {
  'F18-FDG': {
    name: 'F-18 Fluorodeoxyglucose',
    halfLife: 109.8,
    decayConstant: 0.693 / 109.8,
    branchingRatio: 0.967
  },
  'C11-PIB': {
    name: 'C-11 Pittsburgh Compound B',
    halfLife: 20.4,
    decayConstant: 0.693 / 20.4,
    branchingRatio: 0.998
  },
  'Ga68-DOTATATE': {
    name: 'Ga-68 DOTATATE',
    halfLife: 68.0,
    decayConstant: 0.693 / 68.0,
    branchingRatio: 0.891
  },
  'F18-FLORBETAPIR': {
    name: 'F-18 Florbetapir',
    halfLife: 109.8,
    decayConstant: 0.693 / 109.8,
    branchingRatio: 0.967
  }
};

// SUV calculation parameters
interface SUVParameters {
  injectedDose: number; // MBq
  patientWeight: number; // kg
  patientHeight?: number; // cm
  patientAge?: number; // years
  patientSex?: 'M' | 'F';
  injectionTime: string; // HH:MM:SS
  scanTime: string; // HH:MM:SS
  acquisitionDate: string; // YYYY-MM-DD
  radiopharmaceutical: string;
  units: 'bw' | 'lbm' | 'bsa' | 'ibw'; // body weight, lean body mass, body surface area, ideal body weight
  residualDose?: number; // MBq
  extravasation?: boolean;
  bloodGlucose?: number; // mg/dL
}

// Calculate decay factor
export const calculateDecayFactor = (
  injectionTime: string,
  scanTime: string,
  acquisitionDate: string,
  halfLife: number
): number => {
  const injectionDateTime = new Date(`${acquisitionDate}T${injectionTime}`);
  const scanDateTime = new Date(`${acquisitionDate}T${scanTime}`);
  
  const timeDifferenceMinutes = (scanDateTime.getTime() - injectionDateTime.getTime()) / (1000 * 60);
  
  if (timeDifferenceMinutes < 0) {
    throw new Error('Scan time cannot be before injection time');
  }
  
  return Math.exp(-0.693 * timeDifferenceMinutes / halfLife);
};

// Calculate lean body mass using James formula
export const calculateLeanBodyMass = (weight: number, height: number, sex: 'M' | 'F'): number => {
  if (sex === 'M') {
    return 1.1 * weight - 128 * Math.pow(weight / height, 2);
  } else {
    return 1.07 * weight - 148 * Math.pow(weight / height, 2);
  }
};

// Calculate body surface area using Mosteller formula
export const calculateBodySurfaceArea = (weight: number, height: number): number => {
  return Math.sqrt((weight * height) / 3600);
};

// Calculate ideal body weight using Devine formula
export const calculateIdealBodyWeight = (height: number, sex: 'M' | 'F'): number => {
  const heightInches = height / 2.54;
  if (sex === 'M') {
    return 50 + 2.3 * (heightInches - 60);
  } else {
    return 45.5 + 2.3 * (heightInches - 60);
  }
};

// Main SUV calculation function
export const calculateSUV = (
  pixelValue: number,
  parameters: SUVParameters,
  metadata: MeasurementMetadata
): SUVCalculation => {
  const radiopharm = RADIOPHARMACEUTICALS[parameters.radiopharmaceutical] || RADIOPHARMACEUTICALS['F18-FDG'];
  
  // Calculate decay factor
  const decayFactor = calculateDecayFactor(
    parameters.injectionTime,
    parameters.scanTime,
    parameters.acquisitionDate,
    radiopharm.halfLife
  );
  
  // Apply rescale slope and intercept
  const rescaleSlope = metadata.rescaleSlope || 1;
  const rescaleIntercept = metadata.rescaleIntercept || 0;
  const activityConcentration = pixelValue * rescaleSlope + rescaleIntercept;
  
  // Calculate effective dose (accounting for decay and residual dose)
  const effectiveDose = parameters.injectedDose * decayFactor;
  const netDose = parameters.residualDose ? effectiveDose - parameters.residualDose : effectiveDose;
  
  // Calculate normalization factor based on units
  let normalizationFactor: number;
  
  switch (parameters.units) {
    case 'bw': // Body weight
      normalizationFactor = parameters.patientWeight * 1000; // convert kg to g
      break;
      
    case 'lbm': { // Lean body mass
      if (!parameters.patientHeight || !parameters.patientSex) {
        throw new Error('Height and sex required for lean body mass calculation');
      }
      const lbm = calculateLeanBodyMass(parameters.patientWeight, parameters.patientHeight, parameters.patientSex);
      normalizationFactor = lbm * 1000;
      break;
    }
      
    case 'bsa': { // Body surface area
      if (!parameters.patientHeight) {
        throw new Error('Height required for body surface area calculation');
      }
      const bsa = calculateBodySurfaceArea(parameters.patientWeight, parameters.patientHeight);
      normalizationFactor = bsa * 10000; // convert m² to cm²
      break;
    }
      
    case 'ibw': { // Ideal body weight
      if (!parameters.patientHeight || !parameters.patientSex) {
        throw new Error('Height and sex required for ideal body weight calculation');
      }
      const ibw = calculateIdealBodyWeight(parameters.patientHeight, parameters.patientSex);
      normalizationFactor = ibw * 1000;
      break;
    }
      
    default:
      normalizationFactor = parameters.patientWeight * 1000;
  }
  
  // Calculate SUV
  const suv = (activityConcentration * normalizationFactor) / (netDose * 1000000); // convert MBq to Bq
  
  return {
    suvMax: suv,
    suvMean: suv,
    suvPeak: suv,
    suvMin: suv,
    tlg: 0, // Will be calculated for ROI measurements
    mtv: 0, // Will be calculated for ROI measurements
    suvThreshold: 2.5,
    injectedDose: parameters.injectedDose,
    patientWeight: parameters.patientWeight,
    scanTime: parameters.scanTime,
    injectionTime: parameters.injectionTime,
    halfLife: radiopharm.halfLife,
    decayFactor,
    calibrationFactor: rescaleSlope,
    units: parameters.units
  };
};

// Calculate SUV statistics for ROI
export const calculateROISUVStatistics = (
  pixelValues: number[],
  parameters: SUVParameters,
  metadata: MeasurementMetadata,
  _roiArea: number, // mm²
  _pixelSpacing: [number, number], // mm
  _sliceThickness: number // mm
): SUVCalculation => {
  if (pixelValues.length === 0) {
    throw new Error('No pixel values provided');
  }
  
  const radiopharm = RADIOPHARMACEUTICALS[parameters.radiopharmaceutical] || RADIOPHARMACEUTICALS['F18-FDG'];
  
  // Calculate decay factor
  const decayFactor = calculateDecayFactor(
    parameters.injectionTime,
    parameters.scanTime,
    parameters.acquisitionDate,
    radiopharm.halfLife
  );
  
  // Apply rescale slope and intercept to all pixel values
  const rescaleSlope = metadata.rescaleSlope || 1;
  const rescaleIntercept = metadata.rescaleIntercept || 0;
  const activityValues = pixelValues.map(pv => pv * rescaleSlope + rescaleIntercept);
  
  // Calculate effective dose
  const effectiveDose = parameters.injectedDose * decayFactor;
  const netDose = parameters.residualDose ? effectiveDose - parameters.residualDose : effectiveDose;
  
  // Calculate normalization factor
  let normalizationFactor: number;
  
  switch (parameters.units) {
    case 'bw':
      normalizationFactor = parameters.patientWeight * 1000;
      break;
    case 'lbm': {
      if (!parameters.patientHeight || !parameters.patientSex) {
        throw new Error('Height and sex required for lean body mass calculation');
      }
      const lbm = calculateLeanBodyMass(parameters.patientWeight, parameters.patientHeight, parameters.patientSex);
      normalizationFactor = lbm * 1000;
      break;
    }
    case 'bsa': {
      if (!parameters.patientHeight) {
        throw new Error('Height required for body surface area calculation');
      }
      const bsa = calculateBodySurfaceArea(parameters.patientWeight, parameters.patientHeight);
      normalizationFactor = bsa * 10000;
      break;
    }
    case 'ibw': {
      if (!parameters.patientHeight || !parameters.patientSex) {
        throw new Error('Height and sex required for ideal body weight calculation');
      }
      const ibw = calculateIdealBodyWeight(parameters.patientHeight, parameters.patientSex);
      normalizationFactor = ibw * 1000;
      break;
    }
    default:
      normalizationFactor = parameters.patientWeight * 1000;
  }
  
  // Convert activity values to SUV
  const suvValues = activityValues.map(av => (av * normalizationFactor) / (netDose * 1000000));
  
  // Calculate statistics
  const suvMax = Math.max(...suvValues);
  const suvMin = Math.min(...suvValues);
  const suvMean = suvValues.reduce((sum, val) => sum + val, 0) / suvValues.length;
  
  // Calculate SUV peak (average of hottest 1cm³ sphere)
  const suvPeak = calculateSUVPeak(suvValues);
  
  // Calculate metabolic tumor volume (MTV) and total lesion glycolysis (TLG)
  const threshold = 2.5; // Default SUV threshold
  const voxelVolume = _pixelSpacing[0] * _pixelSpacing[1] * _sliceThickness; // mm³
  const thresholdVoxels = suvValues.filter(suv => suv >= threshold);
  
  const mtv = (thresholdVoxels.length * voxelVolume) / 1000; // convert to cm³
  const tlg = thresholdVoxels.reduce((sum, suv) => sum + suv, 0) * mtv;
  
  return {
    suvMax,
    suvMean,
    suvPeak,
    suvMin,
    tlg,
    mtv,
    suvThreshold: threshold,
    injectedDose: parameters.injectedDose,
    patientWeight: parameters.patientWeight,
    scanTime: parameters.scanTime,
    injectionTime: parameters.injectionTime,
    halfLife: radiopharm.halfLife,
    decayFactor,
    calibrationFactor: rescaleSlope,
    units: parameters.units
  };
};

// Calculate SUV peak (average of hottest 1cm³ sphere)
const calculateSUVPeak = (
  suvValues: number[]
): number => {
  // For simplicity, return the mean of the top 10% of values
  // In a full implementation, this would find the 1cm³ sphere with highest average
  const sortedValues = [...suvValues].sort((a, b) => b - a);
  const top10Percent = Math.max(1, Math.floor(sortedValues.length * 0.1));
  const topValues = sortedValues.slice(0, top10Percent);
  
  return topValues.reduce((sum, val) => sum + val, 0) / topValues.length;
};

// Validate SUV calculation parameters
export const validateSUVParameters = (parameters: SUVParameters): string[] => {
  const errors: string[] = [];
  
  if (parameters.injectedDose <= 0) {
    errors.push('Injected dose must be greater than 0');
  }
  
  if (parameters.patientWeight <= 0) {
    errors.push('Patient weight must be greater than 0');
  }
  
  if (!parameters.injectionTime || !parameters.scanTime) {
    errors.push('Injection time and scan time are required');
  }
  
  if (!parameters.acquisitionDate) {
    errors.push('Acquisition date is required');
  }
  
  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (parameters.injectionTime && !timeRegex.test(parameters.injectionTime)) {
    errors.push('Invalid injection time format (use HH:MM or HH:MM:SS)');
  }
  
  if (parameters.scanTime && !timeRegex.test(parameters.scanTime)) {
    errors.push('Invalid scan time format (use HH:MM or HH:MM:SS)');
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (parameters.acquisitionDate && !dateRegex.test(parameters.acquisitionDate)) {
    errors.push('Invalid acquisition date format (use YYYY-MM-DD)');
  }
  
  // Check for reasonable values
  if (parameters.injectedDose > 1000) {
    errors.push('Injected dose seems unusually high (>1000 MBq)');
  }
  
  if (parameters.patientWeight > 300) {
    errors.push('Patient weight seems unusually high (>300 kg)');
  }
  
  if (parameters.patientHeight && (parameters.patientHeight < 50 || parameters.patientHeight > 250)) {
    errors.push('Patient height should be between 50-250 cm');
  }
  
  if (parameters.bloodGlucose && (parameters.bloodGlucose < 50 || parameters.bloodGlucose > 500)) {
    errors.push('Blood glucose should be between 50-500 mg/dL');
  }
  
  return errors;
};

// Calculate quality control metrics
export const calculateQualityMetrics = (
  suvCalculation: SUVCalculation,
  parameters: SUVParameters
): {
  qualityScore: number;
  warnings: string[];
  recommendations: string[];
} => {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let qualityScore = 100;
  
  // Check time between injection and scan
  const injectionTime = new Date(`2000-01-01T${parameters.injectionTime}`);
  const scanTime = new Date(`2000-01-01T${parameters.scanTime}`);
  const timeDiffMinutes = (scanTime.getTime() - injectionTime.getTime()) / (1000 * 60);
  
  if (timeDiffMinutes < 45) {
    warnings.push('Scan performed less than 45 minutes after injection');
    recommendations.push('Consider waiting 60-90 minutes for optimal FDG uptake');
    qualityScore -= 10;
  }
  
  if (timeDiffMinutes > 180) {
    warnings.push('Scan performed more than 3 hours after injection');
    recommendations.push('Late imaging may affect SUV accuracy due to continued redistribution');
    qualityScore -= 5;
  }
  
  // Check blood glucose if available
  if (parameters.bloodGlucose) {
    if (parameters.bloodGlucose > 150) {
      warnings.push('Elevated blood glucose level');
      recommendations.push('High glucose may affect FDG uptake and SUV values');
      qualityScore -= 15;
    }
    
    if (parameters.bloodGlucose > 200) {
      warnings.push('Severely elevated blood glucose level');
      recommendations.push('Consider rescheduling scan or adjusting interpretation');
      qualityScore -= 25;
    }
  }
  
  // Check for extravasation
  if (parameters.extravasation) {
    warnings.push('Extravasation reported at injection site');
    recommendations.push('SUV values may be underestimated due to reduced effective dose');
    qualityScore -= 20;
  }
  
  // Check SUV values for reasonableness
  if (suvCalculation.suvMax > 20) {
    warnings.push('Unusually high SUVmax value');
    recommendations.push('Verify calculation parameters and consider technical factors');
    qualityScore -= 5;
  }
  
  if (suvCalculation.suvMax < 0.5) {
    warnings.push('Unusually low SUVmax value');
    recommendations.push('Check for technical issues or calculation errors');
    qualityScore -= 10;
  }
  
  return {
    qualityScore: Math.max(0, qualityScore),
    warnings,
    recommendations
  };
};

// Export utility functions
export {
  RADIOPHARMACEUTICALS,
  type SUVParameters,
  type Radiopharmaceutical
};