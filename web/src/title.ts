import { data } from './data';
export const byIdTitle = (id: string) => data.reports.find((r) => r.id === id)?.title ?? id;
