export interface TerminalWindowData {
  id: string;
  title: string;
  createdAt: number;
}

export interface WindowManagerState {
  windows: TerminalWindowData[];
  activeWindowId: string | null;
}
