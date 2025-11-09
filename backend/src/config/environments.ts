/**
 * Environment metadata and configuration
 * Provides details about available terminal environments
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

export const ENVIRONMENTS: Record<string, EnvironmentMetadata> = {
  minimal: {
    name: 'minimal',
    display: 'Minimal',
    icon: '⚡',
    description: 'Lightweight & fast - bare essentials only',
    imageSize: '~200MB',
    packages: [
      'zsh',
      'bash',
      'vim',
      'git',
      'curl',
      'python3',
      'make',
      'g++',
    ],
    features: [
      'Basic shell configuration',
      'Essential CLI tools',
      'Minimal history (1,000 lines)',
      'Simple prompt',
      'Fast startup (< 1s)',
    ],
    bootTime: '< 1s',
    recommendedFor: [
      'Quick scripts',
      'CI/CD pipelines',
      'Resource-constrained environments',
      'Fast startup priority',
    ],
  },
  default: {
    name: 'default',
    display: 'Default',
    icon: '🚀',
    description: 'Full-featured with enhanced tools & plugins',
    imageSize: '~240MB',
    packages: [
      'All minimal packages +',
      'zsh-autosuggestions',
      'zsh-syntax-highlighting',
      'bash-completion',
      'wget',
      'nano',
      'htop',
      'ncdu',
      'tree',
      'less',
      'jq',
      'ncurses',
    ],
    features: [
      'Enhanced shell configuration',
      'Command auto-suggestions',
      'Syntax highlighting',
      'Git aliases & integration',
      'Advanced completion',
      'Extended history (10,000 lines)',
      'Customizable prompt with time',
      'System monitoring tools',
    ],
    bootTime: '< 2s',
    recommendedFor: [
      'Interactive development',
      'Full-featured terminal experience',
      'Productivity workflows',
      'System administration',
    ],
  },
};

export const getEnvironmentMetadata = (envName: string): EnvironmentMetadata | null => {
  return ENVIRONMENTS[envName] || null;
};

export const getAllEnvironments = (): EnvironmentMetadata[] => {
  return Object.values(ENVIRONMENTS);
};

export const compareEnvironments = (env1: string, env2: string) => {
  const e1 = ENVIRONMENTS[env1];
  const e2 = ENVIRONMENTS[env2];

  if (!e1 || !e2) return null;

  return {
    comparison: [e1, e2],
    differences: {
      sizeIncrease: '~40MB',
      additionalPackages: e2.packages.length - e1.packages.length,
      additionalFeatures: e2.features.length - e1.features.length,
    },
  };
};
