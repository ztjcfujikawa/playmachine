// 内存缓存，用于存储临时数据
interface MemoryCache {
  [namespace: string]: {
    [key: string]: {
      value: any;
      timestamp: number;
    };
  };
}

export class KVSyncManager {
  private static instance: KVSyncManager;
  private memoryCache: MemoryCache = {};
  private pendingSync: boolean = false;
  private syncTimer: number | null = null;
  private syncDelay: number = 300000; // 5分钟延迟

  // 单例模式
  public static getInstance(): KVSyncManager {
    if (!KVSyncManager.instance) {
      KVSyncManager.instance = new KVSyncManager();
    }
    return KVSyncManager.instance;
  }

  private constructor() {
    console.log('KV同步管理器初始化，设置延迟时间：' + this.syncDelay / 1000 + '秒');
  }

  // 设置KV值（带延迟写入）
  public async setKV(namespace: KVNamespace, key: string, value: any, inMemoryOnly: boolean = false): Promise<void> {
    // 将值存储在内存缓存中
    const namespaceName = this.getNamespaceName(namespace);
    if (!this.memoryCache[namespaceName]) {
      this.memoryCache[namespaceName] = {};
    }
    
    // 存储值和时间戳
    this.memoryCache[namespaceName][key] = {
      value,
      timestamp: Date.now()
    };
    
    console.log(`[KVSync] 值已存储在内存缓存中: ${namespaceName}/${key}`);
    
    // 如果是仅内存标记，不调度同步
    if (inMemoryOnly) {
      return;
    }
    
    // 调度同步
    await this.scheduleSync();
  }

  // 获取KV值（优先从内存缓存获取）
  public async getKV(namespace: KVNamespace, key: string, type: "text" | "json" | "arrayBuffer" | "stream" = "text"): Promise<any> {
    const namespaceName = this.getNamespaceName(namespace);
    
    // 检查内存缓存中是否有值
    if (this.memoryCache[namespaceName] && this.memoryCache[namespaceName][key]) {
      console.log(`[KVSync] 从内存缓存中获取值: ${namespaceName}/${key}`);
      return this.memoryCache[namespaceName][key].value;
    }
    
    // 如果内存缓存没有，从KV存储获取
    console.log(`[KVSync] 从KV存储获取值: ${namespaceName}/${key}`);
    const value = await namespace.get(key, type as any);
    
    // 将获取的值存储在内存缓存中
    if (value !== null) {
      if (!this.memoryCache[namespaceName]) {
        this.memoryCache[namespaceName] = {};
      }
      this.memoryCache[namespaceName][key] = {
        value,
        timestamp: Date.now()
      };
    }
    
    return value;
  }

  // 删除KV值
  public async deleteKV(namespace: KVNamespace, key: string): Promise<void> {
    const namespaceName = this.getNamespaceName(namespace);
    
    // 从内存缓存中删除
    if (this.memoryCache[namespaceName] && this.memoryCache[namespaceName][key]) {
      delete this.memoryCache[namespaceName][key];
      console.log(`[KVSync] 从内存缓存中删除值: ${namespaceName}/${key}`);
    }
    
    // 从KV存储中删除
    await namespace.delete(key);
    console.log(`[KVSync] 从KV存储中删除值: ${namespaceName}/${key}`);
  }

  // 列出命名空间中的所有键
  public async listKV(namespace: KVNamespace, options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown>> {
    return await namespace.list(options);
  }

  // 调度同步操作
  private async scheduleSync(): Promise<boolean> {
    // 如果已经有一个同步被调度，只标记为pendingSync
    if (this.syncTimer !== null) {
      console.log('[KVSync] 同步已调度。标记为待处理。');
      this.pendingSync = true;
      return true;
    }
    
    // 调度新的同步
    console.log(`[KVSync] 调度KV同步，延迟${this.syncDelay / 1000}秒`);
    this.pendingSync = true;
    
    // 使用setTimeout而不是setInterval，因为我们需要在完成后重新调度
    // 注意：在真实的Workers环境中，这需要使用waitUntil或其他机制保证执行
    this.syncTimer = setTimeout(async () => {
      // 重置标志
      this.pendingSync = false;
      const currentTimer = this.syncTimer;
      this.syncTimer = null;
      
      console.log('[KVSync] 开始KV同步...');
      try {
        await this.syncKVs();
        console.log('[KVSync] KV同步完成');
        
        // 如果有待处理的同步，再次调度
        if (this.pendingSync) {
          this.scheduleSync();
        }
      } catch (error) {
        console.error('[KVSync] KV同步过程中出错:', error);
        
        // 即使出错也清理定时器
        if (this.syncTimer === currentTimer) {
          this.syncTimer = null;
        }
        
        // 如果有待处理的同步，再次调度
        if (this.pendingSync) {
          this.scheduleSync();
        }
      }
    }, this.syncDelay) as unknown as number;
    
    return true;
  }

  // 同步所有KV
  private async syncKVs(): Promise<void> {
    for (const namespaceName in this.memoryCache) {
      for (const key in this.memoryCache[namespaceName]) {
        try {
          const entry = this.memoryCache[namespaceName][key];
          const namespace = this.getNamespaceFromName(namespaceName);
          
          if (namespace) {
            await namespace.put(key, typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value));
            console.log(`[KVSync] 已同步值到KV存储: ${namespaceName}/${key}`);
          } else {
            console.error(`[KVSync] 无法找到命名空间: ${namespaceName}`);
          }
        } catch (error) {
          console.error(`[KVSync] 同步值时出错 ${namespaceName}/${key}:`, error);
        }
      }
    }
  }

  // 获取命名空间名称
  private getNamespaceName(namespace: KVNamespace): string {
    // 由于Workers环境中无法直接获取KVNamespace的名称，
    // 我们使用一个临时唯一ID作为名称
    return (namespace as any).id || `namespace_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 从名称获取命名空间（需要在使用时注入实际的命名空间）
  private namespaceRegistry: {[name: string]: KVNamespace} = {};
  
  public registerNamespace(namespace: KVNamespace): void {
    const name = this.getNamespaceName(namespace);
    this.namespaceRegistry[name] = namespace;
  }
  
  private getNamespaceFromName(name: string): KVNamespace | null {
    return this.namespaceRegistry[name] || null;
  }
}

// 导出单例实例
export const kvSyncManager = KVSyncManager.getInstance();
