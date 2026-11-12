/**
 * A switch for 2 to 4 short choices. It is a group of radio buttons underneath, so it submits with a normal GET form
 * and works without JavaScript. Longer lists (areas, collectors) stay dropdowns.
 */
export function Segmented({ name, label, options, value }: { name: string; label: string; options: { value: string; label: string }[]; value: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="seg">
      {options.map((o) => (
        <label key={o.value}>
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === value} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
