export interface TelemetryPoint {
  id: string;
  individualId: string;
  timestamp: number; // Unix epoch milliseconds
  latitude: number;
  longitude: number;
  altitude?: number; // meters
  groundSpeed?: number; // m/s
  temperature?: number; // Celsius
  sensorType: 'GPS' | 'Argos Doppler';
}

export interface AnimalTrack {
  individualId: string;
  speciesName: string;
  commonName: string;
  tagDeployDate: string;
  color: string; // Hex for map vector styling
  points: TelemetryPoint[];
}

export type PlaybackSpeed = 1 | 5 | 10 | 50 | 100;

export interface MigrationDataset {
  datasetId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  tracks: AnimalTrack[];
}
