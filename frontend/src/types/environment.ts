/**
 * Environment metadata types (matches backend)
 */

export interface EnvironmentMetadata {
  name: string;
  display: string;
  icon: string;
  description: string;
  imageSize: string;
  packages: string[];
  features: string[];
  bootTime: string;
  recommendedFor: string[];
}

export interface EnvironmentComparison {
  comparison: [EnvironmentMetadata, EnvironmentMetadata];
  differences: {
    sizeIncrease: string;
    additionalPackages: number;
    additionalFeatures: number;
  };
}
