import { useState, useEffect } from 'react';

export interface ModelConfig {
  name: string;
  path: string;
  scale: number | [number, number, number];
  rotation: [number, number, number];
  centerOffset: [number, number, number];
  propellers: string[];
  description: string;
}

interface ModelConfigData {
  models: Record<string, ModelConfig>;
  defaultModel: string;
}

// Singleton to store the config once loaded
let configCache: ModelConfigData | null = null;
let configPromise: Promise<ModelConfigData> | null = null;

export const loadConfig = async (): Promise<ModelConfigData> => {
  if (configCache) return configCache;
  
  if (!configPromise) {
    configPromise = fetch('/models/config.json')
      .then(res => res.json())
      .then((data: ModelConfigData) => {
        configCache = data;
        return data;
      });
  }
  
  return configPromise;
};

export function useModelConfig() {
  const [config, setConfig] = useState<ModelConfigData | null>(configCache);
  const [currentModel, setCurrentModel] = useState<string>('quad_2'); // Start with the default to avoid switching
  const [loading, setLoading] = useState(!configCache);

  useEffect(() => {
    if (!configCache) {
      loadConfig()
        .then((data) => {
          setConfig(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load model config:', err);
          setLoading(false);
        });
    }
  }, []);

  const getModelConfig = (modelId?: string): ModelConfig | null => {
    if (!config) return null;
    const id = modelId || currentModel;
    return config.models[id] || null;
  };

  return {
    config,
    currentModel,
    setCurrentModel,
    getModelConfig,
    loading
  };
}