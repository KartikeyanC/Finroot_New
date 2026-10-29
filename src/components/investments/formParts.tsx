import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Form building blocks for AddInvestmentDialog, split out to keep that file
// under the 30 kB limit.

// Hoisted so identity is stable across renders — inline definitions caused
// the input to remount on every keystroke (focus loss + value stripping).
export const NumberInput = ({
  id,
  placeholder,
  step,
  value,
  onChange,
}: {
  id: string;
  placeholder?: string;
  step?: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  // Indian-format display (e.g. 1,00,000.50) while storing a plain numeric
  // string ("100000.5") in form state.
  const formatIndian = (raw: string) => {
    if (raw === "" || raw == null) return "";
    // Preserve a trailing "." while the user is typing decimals.
    const trailingDot = raw.endsWith(".") && !raw.slice(0, -1).includes(".");
    const [intPart, decPart] = raw.split(".");
    if (intPart === "" || intPart === "-") {
      return raw;
    }
    const neg = intPart.startsWith("-");
    const digits = neg ? intPart.slice(1) : intPart;
    if (!/^\d+$/.test(digits)) return raw;
    let formattedInt: string;
    if (digits.length <= 3) {
      formattedInt = digits;
    } else {
      const last3 = digits.slice(-3);
      const rest = digits.slice(0, -3);
      formattedInt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    const signed = neg ? "-" + formattedInt : formattedInt;
    if (decPart !== undefined) return `${signed}.${decPart}`;
    if (trailingDot) return `${signed}.`;
    return signed;
  };
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? "0.00"}
      value={formatIndian(value)}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/,/g, "");
        if (cleaned === "" || /^-?\d*\.?\d*$/.test(cleaned)) {
          onChange(cleaned);
        }
      }}
    />
  );
};

export const OutputBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/40 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
  </div>
);

export function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground flex items-center">
        {label}
      </Label>
      {children}
    </div>
  );
}