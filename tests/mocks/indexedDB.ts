/**
 * IndexedDB Mock 配置
 *
 * 为Vitest测试环境提供IndexedDB mock支持
 * 使用 fake-indexeddb 库模拟浏览器IndexedDB
 *
 * 修复版本v3: 使用正确的导入方式
 */

import * as fakeIndexedDBModule from 'fake-indexeddb';

// 从模块中提取所需的对象
const { indexedDB, IDBDatabase, IDBTransaction, IDBRequest, IDBObjectStore, IDBCursorWithValue, IDBCursor, IDBKeyRange, IDBOpenDBRequest, IDBVersionChangeEvent } = fakeIndexedDBModule;

// 导出fake indexedDB实例
export const fakeIndexedDB = indexedDB;

/**
 * 设置全局IndexedDB mock
 *
 * 关键发现: fake-indexeddb包直接导出indexedDB实例和各个类
 * 正确的导入方式: import * as fakeIndexedDBModule from 'fake-indexeddb'
 * 然后解构所需的对象
 */
export function setupIndexedDBMock(): void {
  // 在全局环境中设置fake indexedDB
  if (typeof global !== 'undefined') {
    (global as any).indexedDB = indexedDB;
    (global as any).IDBDatabase = IDBDatabase;
    (global as any).IDBTransaction = IDBTransaction;
    (global as any).IDBRequest = IDBRequest;
    (global as any).IDBObjectStore = IDBObjectStore;
    (global as any).IDBCursorWithValue = IDBCursorWithValue;
    (global as any).IDBCursor = IDBCursor;
    (global as any).IDBKeyRange = IDBKeyRange;
    (global as any).IDBOpenDBRequest = IDBOpenDBRequest;
    (global as any).IDBVersionChangeEvent = IDBVersionChangeEvent;
  }

  // 如果在window环境中（jsdom）
  if (typeof window !== 'undefined') {
    (window as any).indexedDB = indexedDB;
    (window as any).IDBDatabase = IDBDatabase;
    (window as any).IDBTransaction = IDBTransaction;
    (window as any).IDBRequest = IDBRequest;
    (window as any).IDBObjectStore = IDBObjectStore;
    (window as any).IDBCursorWithValue = IDBCursorWithValue;
    (window as any).IDBCursor = IDBCursor;
    (window as any).IDBKeyRange = IDBKeyRange;
    (window as any).IDBOpenDBRequest = IDBOpenDBRequest;
    (window as any).IDBVersionChangeEvent = IDBVersionChangeEvent;
  }

  console.log('✓ IndexedDB mock 已设置 (修复版本v3 - 正确的导入方式)');
}

/**
 * 清理IndexedDB mock
 */
export function cleanupIndexedDBMock(): void {
  // 清理所有数据库
  if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
    indexedDB.databases().then((databases: any[]) => {
      databases.forEach((db: any) => {
        indexedDB.deleteDatabase(db.name);
      });
    });
  }

  console.log('✓ IndexedDB mock 已清理');
}

// 自动设置（如果作为setup文件运行）
setupIndexedDBMock();
