import { forwardRef, HTMLAttributes, ChangeEvent } from 'react';
import { cn } from './utils';
import { EzTextInput } from './EzTextInput';
import { EzNumberInput } from './EzNumberInput';
import { EzDateInput } from './EzDateInput';
import { EzDateTimeInput } from './EzDateTimeInput';
import { EzComboBox } from './EzComboBox';
import { EzTextArea } from './EzTextArea';
import { EzCheck } from './EzCheck';
import { EzRadioButton } from './EzRadioButton';

/** A single selectable option, used by `select` and `radio` field types. */
export type EzEntityFormFieldOption = {
  label: string;
  value: string;
};

/**
 * Generic field descriptor consumed by `EzEntityForm`.
 * Mirrors (visually only) the metadata Sankhya's `snk-form` would otherwise
 * load automatically from the ERP's Dicionário de Dados.
 */
export type EzEntityFormField = {
  /** Key used to read/write the field's value in `values`/`onChange`. */
  name: string;
  /** Label displayed above (or next to) the field's editor. */
  label: string;
  /** Which DS input is rendered for this field. */
  type: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'textarea' | 'checkbox' | 'radio';
  /** When true, shows a required visual indicator ("*") next to the label. */
  required?: boolean;
  /** Options rendered for `select` and `radio` field types. */
  options?: EzEntityFormFieldOption[];
  /** Grid column span used when `layout="SIDE_BY_SIDE"`. @default 1 */
  colSpan?: 1 | 2;
}; 

export type EzEntityFormProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** Generic schema describing which fields to render and how. */
  fields: EzEntityFormField[];
  /** Current value for every field, keyed by field name. */
  values: Record<string, unknown>;
  /** Called with the field name and its new value whenever any field changes. */
  onChange: (name: string, value: unknown) => void;
  /** Validation error message per field name, keyed by field name. */
  errors?: Record<string, string>;
  /**
   * `CASCADE` stacks fields in a single column; `SIDE_BY_SIDE` arranges them
   * in a 2-column grid, respecting each field's `colSpan`.
   * @default 'CASCADE'
   */
  layout?: 'CASCADE' | 'SIDE_BY_SIDE';
};

/**
 * Aponta DS Entity Form
 * Renders form fields from a generic schema (`fields`), composing the
 * existing DS inputs (EzTextInput, EzNumberInput, EzDateInput,
 * EzDateTimeInput, EzComboBox, EzTextArea, EzCheck, EzRadioButton) according
 * to each field's `type`. Purely visual counterpart to Sankhya's `snk-form`:
 * it has no SnkApplication/SnkDataUnit/Dicionário de Dados dependency — the
 * schema is supplied entirely via props.
 */
export const EzEntityForm = forwardRef<HTMLDivElement, EzEntityFormProps>(
  ({ fields, values, onChange, errors, layout = 'CASCADE', className, ...props }, ref) => {
    const isSideBySide = layout === 'SIDE_BY_SIDE';

    return (
      <div
        ref={ref}
        className={cn(
          'grid gap-4',
          isSideBySide ? 'grid-cols-2' : 'grid-cols-1',
          className
        )}
        {...props}
      >
        {fields.map((field) => {
          const colSpanClass = isSideBySide && field.colSpan === 2 ? 'col-span-2' : 'col-span-1';
          const value = values[field.name];
          const errorMessage = errors?.[field.name];
          const inputId = `ez-entity-form-${field.name}`;

          return (
            <div key={field.name} data-field-name={field.name} className={colSpanClass}>
              {renderField(field, value, errorMessage, inputId, onChange)}
            </div>
          );
        })}
      </div>
    );
  }
);

function renderField(
  field: EzEntityFormField,
  value: unknown,
  errorMessage: string | undefined,
  inputId: string,
  onChange: (name: string, value: unknown) => void
) {
  switch (field.type) {
    case 'text':
      return (
        <EzTextInput
          id={inputId}
          label={field.label}
          required={field.required}
          hasError={!!errorMessage}
          message={errorMessage}
          value={(value as string) ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.value)}
        />
      );

    case 'number':
      return (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={inputId} field={field} />
          <EzNumberInput
            id={inputId}
            value={(value as number) ?? 0}
            onChange={(next) => onChange(field.name, next)}
          />
          {errorMessage && <FieldError message={errorMessage} />}
        </div>
      );

    case 'date':
      return (
        <EzDateInput
          id={inputId}
          label={field.label}
          required={field.required}
          hasError={!!errorMessage}
          message={errorMessage}
          value={(value as string) ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.value)}
        />
      );

    case 'datetime':
      return (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={inputId} field={field} />
          <EzDateTimeInput
            id={inputId}
            hasError={!!errorMessage}
            value={(value as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.value)}
          />
          {errorMessage && <FieldError message={errorMessage} />}
        </div>
      );

    case 'select':
      return (
        <EzComboBox
          id={inputId}
          label={field.label}
          required={field.required}
          hasError={!!errorMessage}
          message={errorMessage}
          value={(value as string) ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(field.name, e.target.value)}
        >
          <option value="" disabled hidden>
            Selecione...
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </EzComboBox>
      );

    case 'textarea':
      return (
        <EzTextArea
          id={inputId}
          label={field.label}
          required={field.required}
          hasError={!!errorMessage}
          message={errorMessage}
          value={(value as string) ?? ''}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(field.name, e.target.value)}
        />
      );

    case 'checkbox':
      return (
        <div className="flex flex-col gap-1.5">
          <EzCheck
            id={inputId}
            label={labelWithRequired(field)}
            hasError={!!errorMessage}
            checked={!!value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.checked)}
          />
          {errorMessage && <FieldError message={errorMessage} />}
        </div>
      );

    case 'radio':
      return (
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium leading-none text-gray-900 select-none">
            {labelWithRequired(field)}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {(field.options ?? []).map((opt) => (
              <EzRadioButton
                key={opt.value}
                id={`${inputId}-${opt.value}`}
                name={field.name}
                label={opt.label}
                hasError={!!errorMessage}
                checked={value === opt.value}
                onChange={() => onChange(field.name, opt.value)}
              />
            ))}
          </div>
          {errorMessage && <FieldError message={errorMessage} />}
        </div>
      );

    default:
      return null;
  }
}

function labelWithRequired(field: EzEntityFormField) {
  return (
    <>
      {field.label}
      {field.required && <span className="ml-1 text-red-600">*</span>}
    </>
  );
}

function FieldLabel({ field, htmlFor }: { field: EzEntityFormField; htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[14px] font-medium leading-none mb-0.5 select-none text-gray-900"
    >
      {field.label}
      {field.required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="text-[12px] font-medium leading-none text-red-700">{message}</span>;
}

EzEntityForm.displayName = 'EzEntityForm';
