export {
  artifactRow,
  dateFromPath,
  detectShape,
  inferArtifactType,
  modelRunFromManifest,
  modelRunFromPredictionArtifact,
  predictionRowsFromArtifact,
  readJsonArtifact,
  sha256File,
  sha256Text,
} from '../../shared/model-artifacts/parse.mjs';

export const sourceFamily = 'mlb-model-artifacts';
export const sport = 'mlb';
