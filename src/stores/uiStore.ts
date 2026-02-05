/**
 * UI状态管理 - Zustand Store
 *
 * 管理全局UI状态，包括主题、布局、通知、模态框等
 *
 * @version 2.0.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============ 类型定义 ============

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UIState {
  // 主题设置
  theme: ThemeMode;
  primaryColor: string;

  // 布局设置
  sidebarCollapsed: boolean;
  rightPanelWidth: number;
  rightPanelOpen: boolean;

  // 通知
  notifications: Notification[];
  maxNotifications: number;

  // 模态框
  activeModals: Set<string>;

  // 加载状态
  loadingStates: Map<string, boolean>;

  // 面板状态
  panels: {
    dataQuality: boolean;
    batchProgress: boolean;
    documentPreview: boolean;
  };

  // ============ 主题操作 ============

  setTheme: (theme: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  toggleTheme: () => void;

  // ============ 布局操作 ============

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  // ============ 通知操作 ============

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  showSuccess: (title: string, message: string, duration?: number) => string;
  showError: (title: string, message: string, duration?: number) => string;
  showWarning: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;

  // ============ 模态框操作 ============

  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  isModalOpen: (modalId: string) => boolean;

  // ============ 加载状态 ============

  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  clearLoadingStates: () => void;

  // ============ 面板操作 ============

  togglePanel: (panelName: keyof UIState['panels']) => void;
  setPanelOpen: (panelName: keyof UIState['panels'], open: boolean) => void;
}

// ============ 辅助函数 ============

// 序列化Set为数组
const setToArr = (set: Set<string>): string[] => Array.from(set);

// 数组反序列化为Set
const arrToSet = (arr: string[]): Set<string> => new Set(arr);

// ============ Store创建 ============

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        theme: 'light',
        primaryColor: '#10b981', // emerald-500
        sidebarCollapsed: false,
        rightPanelWidth: 320,
        rightPanelOpen: false,
        notifications: [],
        maxNotifications: 5,
        activeModals: new Set(),
        loadingStates: new Map(),
        panels: {
          dataQuality: false,
          batchProgress: false,
          documentPreview: false
        },

        // ============ 主题操作 ============

        setTheme: (theme) => set({ theme }, false, 'setTheme'),

        setPrimaryColor: (color) => set({ primaryColor: color }, false, 'setPrimaryColor'),

        toggleTheme: () => set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }), false, 'toggleTheme'),

        // ============ 布局操作 ============

        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        }), false, 'toggleSidebar'),

        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed'),

        setRightPanelWidth: (width) => set({ rightPanelWidth: width }, false, 'setRightPanelWidth'),

        toggleRightPanel: () => set((state) => ({
          rightPanelOpen: !state.rightPanelOpen
        }), false, 'toggleRightPanel'),

        setRightPanelOpen: (open) => set({ rightPanelOpen: open }, false, 'setRightPanelOpen'),

        // ============ 通知操作 ============

        addNotification: (notification) => set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
          };

          let notifications = [...state.notifications, newNotification];

          // 限制通知数量
          if (notifications.length > state.maxNotifications) {
            notifications = notifications.slice(-state.maxNotifications);
          }

          // 自动移除（duration为0表示不自动移除）
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(newNotification.id);
            }, notification.duration || 5000);
          }

          return { notifications };
        }, false, 'addNotification'),

        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }), false, 'removeNotification'),

        clearNotifications: () => set({ notifications: [] }, false, 'clearNotifications'),

        showSuccess: (title, message, duration) => {
          return get().addNotification({
            type: 'success',
            title,
            message,
            duration
          });
        },

        showError: (title, message, duration) => {
          return get().addNotification({
            type: 'error',
            title,
            message,
            duration: duration || 0 // 错误通知默认不自动移除
          });
        },

        showWarning: (title, message, duration) => {
          return get().addNotification({
            type: 'warning',
            title,
            message,
            duration
          });
        },

        showInfo: (title, message, duration) => {
          return get().addNotification({
            type: 'info',
            title,
            message,
            duration
          });
        },

        // ============ 模态框操作 ============

        openModal: (modalId) => set((state) => {
          const activeModals = new Set(state.activeModals);
          activeModals.add(modalId);
          return { activeModals };
        }, false, 'openModal'),

        closeModal: (modalId) => set((state) => {
          const activeModals = new Set(state.activeModals);
          activeModals.delete(modalId);
          return { activeModals };
        }, false, 'closeModal'),

        closeAllModals: () => set({ activeModals: new Set() }, false, 'closeAllModals'),

        isModalOpen: (modalId) => {
          return get().activeModals.has(modalId);
        },

        // ============ 加载状态 ============

        setLoading: (key, loading) => set((state) => {
          const loadingStates = new Map(state.loadingStates);
          loadingStates.set(key, loading);
          return { loadingStates };
        }, false, 'setLoading'),

        isLoading: (key) => {
          return get().loadingStates.get(key) || false;
        },

        clearLoadingStates: () => set({ loadingStates: new Map() }, false, 'clearLoadingStates'),

        // ============ 面板操作 ============

        togglePanel: (panelName) => set((state) => ({
          panels: {
            ...state.panels,
            [panelName]: !state.panels[panelName]
          }
        }), false, 'togglePanel'),

        setPanelOpen: (panelName, open) => set((state) => ({
          panels: {
            ...state.panels,
            [panelName]: open
          }
        }), false, 'setPanelOpen')
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          primaryColor: state.primaryColor,
          sidebarCollapsed: state.sidebarCollapsed,
          rightPanelWidth: state.rightPanelWidth,
          panels: state.panels
        })
      }
    ),
    { name: 'UIStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============ 便捷Hooks ============

/**
 * 获取主题设置
 */
export const useTheme = () => useUIStore(state => state.theme);

/**
 * 获取主题色
 */
export const usePrimaryColor = () => useUIStore(state => state.primaryColor);

/**
 * 获取侧边栏状态
 */
export const useSidebarCollapsed = () => useUIStore(state => state.sidebarCollapsed);

/**
 * 获取通知列表
 */
export const useNotifications = () => useUIStore(state => state.notifications);

/**
 * 获取模态框状态
 */
export const useActiveModals = () => useUIStore(state => state.activeModals);

/**
 * 获取面板状态
 */
export const usePanels = () => useUIStore(state => state.panels);

/**
 * 获取UI操作方法
 */
export const useUIActions = () => useUIStore(state => ({
  setTheme: state.setTheme,
  setPrimaryColor: state.setPrimaryColor,
  toggleTheme: state.toggleTheme,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setRightPanelWidth: state.setRightPanelWidth,
  toggleRightPanel: state.toggleRightPanel,
  setRightPanelOpen: state.setRightPanelOpen,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  showSuccess: state.showSuccess,
  showError: state.showError,
  showWarning: state.showWarning,
  showInfo: state.showInfo,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  isModalOpen: state.isModalOpen,
  setLoading: state.setLoading,
  isLoading: state.isLoading,
  clearLoadingStates: state.clearLoadingStates,
  togglePanel: state.togglePanel,
  setPanelOpen: state.setPanelOpen
}));
