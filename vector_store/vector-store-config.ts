import fs from 'node:fs';
import path from 'node:path';

interface VectorStoreConfig {
    vector_store_id: string;
    name: string;
}

let cachedConfig: VectorStoreConfig | null = null;

export function getVectorStoreConfig(): VectorStoreConfig | null {
    if (cachedConfig) {
        return cachedConfig;
    }

    try {
        const configPath = path.join(process.cwd(), 'vector_store', 'config.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        cachedConfig = JSON.parse(configData);
        return cachedConfig;
    } catch (error) {
        console.warn('Vector store configuration not found or invalid:', error);
        return null;
    }
}

export function getVectorStoreId(): string | null {
    const config = getVectorStoreConfig();
    return config?.vector_store_id || null;
}