export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  dueDate?: string;
}

export interface Course {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused';
  description?: string;
  tasks: Task[];
  manualProgressPercent?: number;
  useManualProgress: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDateTime: string; // ISO String (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  endDateTime: string;   // ISO String (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  type: 'Meeting' | 'Exam' | 'Homework' | 'Deadline' | 'Other';
  location?: string;
  notes?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  fileType?: string; // 'pdf' | 'txt' | 'other'
  fileSize?: string;
  fileData?: string; // Base64 string for download or plain text
}
