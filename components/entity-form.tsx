import type { Field, Entity } from '@/lib/entities';

/**
 * Server-rendered form for create/edit. Booleans render as checkboxes;
 * uuid fields with lookups render as selects populated with parent rows.
 */
export default function EntityForm({
  entity,
  row,
  uuidOptions,
}: {
  entity: Entity;
  row?: Record<string, unknown> | null;
  uuidOptions: Record<string, { value: string; label: string }[]>;
}) {
  return (
    <div className="space-y-5">
      {entity.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={row?.[field.name]}
          options={uuidOptions[field.name] ?? field.options}
        />
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  options,
}: {
  field: Field;
  value: unknown;
  options?: { value: string; label: string }[];
}) {
  const inputCls =
    'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20';
  const strValue =
    value === null || value === undefined ? '' : String(value);

  return (
    <div>
      <label htmlFor={field.name} className="mb-1.5 block text-sm font-bold text-slate-700">
        {field.label}
        {field.required && <span className="ml-0.5 text-[#FF6F00]">*</span>}
      </label>

      {field.type === 'boolean' ? (
        <label className="flex items-center gap-2.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600">
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            defaultChecked={value === true}
            className="h-4 w-4 accent-[#FF6F00]"
          />
          {value === true ? 'Enabled' : 'Disabled'}
        </label>
      ) : field.type === 'textarea' ? (
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={strValue}
          required={field.required}
          rows={3}
          placeholder={field.placeholder}
          className={inputCls}
        />
      ) : field.type === 'select' || (field.type === 'uuid' && options?.length) ? (
        <select
          id={field.name}
          name={field.name}
          defaultValue={strValue}
          required={field.required}
          className={inputCls}
        >
          <option value="">— none —</option>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'date'
                : field.type === 'url'
                  ? 'url'
                  : 'text'
          }
          step={field.type === 'number' ? 'any' : undefined}
          defaultValue={strValue}
          required={field.required}
          placeholder={field.placeholder}
          className={inputCls}
        />
      )}

      {field.help && (
        <p className="mt-1 text-xs font-medium text-slate-400">{field.help}</p>
      )}
    </div>
  );
}
