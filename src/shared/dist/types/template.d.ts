/**
 * Template Types
 */
import type { FieldKey } from './contact';
export interface FieldConfig {
    fieldKey: FieldKey;
    required: boolean;
    order: number;
}
export interface Template {
    id: string;
    name: string;
    description: string | null;
    fields: FieldConfig[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=template.d.ts.map