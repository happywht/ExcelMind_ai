/**
 * IndexedDB Mock 配置
 *
 * 为Vitest测试环境提供IndexedDB mock支持
 * 使用 fake-indexeddb 库模拟浏览器IndexedDB
 */

import { FakeIndexedDB, fakeIndexedDB } from 'fake-indexeddb';

// 导出fake indexedDB实例
export { fakeIndexedDB };

/**
 * 设置全局IndexedDB mock
 */
export function setupIndexedDBMock(): void {
  // 在全局环境中设置fake indexedDB
  if (typeof global !== 'undefined') {
    (global as any).indexedDB = new FakeIndexedDB();
    (global as any).IDBDatabase = FakeIndexedDB;
    (global as any).IDBTransaction = fakeIndexedDB.IDBTransaction;
    (global as any).IDBRequest = fakeIndexedDB.IDBRequest;
    (global as any).IDBObjectStore = fakeIndexedDB.IDBObjectStore;
    (global as any).IDBCursorWithValue = fakeIndexedDB.IDBCursorWithValue;
    (global as any).IDBCursor = fakeIndexedDB.IDBCursor;
    (global as any).IDBKeyRange = fakeIndexedDB.IDBKeyRange;
    (global as any).IDBOpenDBRequest = fakeIndexedDB.IDBOpenDBRequest;
    (global as any).IDBVersionChangeEvent = fakeIndexedDB.IDBVersionChangeEvent;
  }

  // 如果在window环境中（jsdom）
  if (typeof window !== 'undefined') {
    (window as any).indexedDB = new FakeIndexedDB();
    (window as any).IDBDatabase = FakeIndexedDB;
    (window as any).IDBTransaction = fakeIndexedDB.IDBTransaction;
    (window as any).IDBRequest = fakeIndexedDB.IDBRequest;
    (window as any).IDBObjectStore = fakeIndexedDB.IDBObjectStore;
    (window as any).IDBCursorWithValue = fakeIndexedDB.IDBCursorWithValue;
    (window as any).IDBCursor = fakeIndexedDB.IDBCursor;
    (window as any).IDBKeyRange = fakeIndexedDB.IDBKeyRange;
    (window as any).IDBOpenDBRequest = fakeIndexedDB.IDBOpenDBRequest;
    (window as any).IDBVersionChangeEvent = fakeIndexedDB.IDBVersionChangeEvent;
  }

  console.log('✓ IndexedDB mock 已设置');
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
