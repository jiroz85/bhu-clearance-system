interface StandardChecklistProps {
  departmentData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  fields: Array<{
    key: string;
    label: string;
    type:
      | "text"
      | "number"
      | "date"
      | "boolean"
      | "select"
      | "textarea"
      | "file";
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  departmentName: string;
  departmentColor: string;
  departmentIcon: string;
}

export function StandardChecklist({
  departmentData,
  onChange,
  fields,
  departmentName,
  departmentColor,
  departmentIcon,
}: StandardChecklistProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...departmentData, [key]: value });
  };

  const renderField = (field: any) => {
    const value = departmentData[field.key] || "";

    switch (field.type) {
      case "text":
      case "number":
        return (
          <input
            type={field.type}
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) =>
              updateField(
                field.key,
                field.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            required={field.required}
          />
        );

      case "textarea":
        return (
          <textarea
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            rows={3}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={field.required}
          />
        );

      case "select":
        return (
          <select
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <div className="mt-1 flex items-center">
            <input
              type="checkbox"
              className="rounded border-slate-200 mr-2"
              checked={value}
              onChange={(e) => updateField(field.key, e.target.checked)}
              required={field.required}
            />
            <span className="text-sm text-slate-600">{field.label}</span>
          </div>
        );

      case "file":
        return (
          <input
            type="file"
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            onChange={(e) => updateField(field.key, e.target.files?.[0])}
            required={field.required}
          />
        );

      case "date":
        return (
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={field.required}
          />
        );

      default:
        return null;
    }
  };

  const getCompletionStatus = () => {
    const requiredFields = fields.filter((f) => f.required);
    const completedFields = requiredFields.filter((f) => {
      const value = departmentData[f.key];
      if (f.type === "boolean") return value === true;
      return value !== "" && value !== null && value !== undefined;
    });

    return {
      completed: completedFields.length,
      total: requiredFields.length,
      percentage: Math.round(
        (completedFields.length / requiredFields.length) * 100,
      ),
    };
  };

  const status = getCompletionStatus();

  return (
    <div
      className="space-y-4 p-4 rounded-lg"
      style={{ backgroundColor: `${departmentColor}10` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-xl">{departmentIcon}</div>
        <div>
          <h4
            className="text-base font-semibold"
            style={{ color: departmentColor }}
          >
            {departmentName} Clearance
          </h4>
          <div className="text-sm text-slate-600">
            Progress: {status.completed}/{status.total} ({status.percentage}%)
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${status.percentage}%`,
            backgroundColor: departmentColor,
          }}
        />
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "md:col-span-2" : ""}
          >
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div
        className="mt-4 p-3 bg-white rounded border"
        style={{ borderColor: departmentColor }}
      >
        <h5 className="text-sm font-medium text-slate-700 mb-2">
          Clearance Status
        </h5>
        <div className="space-y-1 text-xs">
          {fields
            .filter((f) => f.required)
            .map((field) => {
              const value = departmentData[field.key];
              const isComplete =
                field.type === "boolean"
                  ? value === true
                  : value !== "" && value !== null && value !== undefined;

              return (
                <div key={field.key} className="flex justify-between">
                  <span className="text-slate-600">{field.label}:</span>
                  <span
                    className={`font-medium ${isComplete ? "text-green-600" : "text-red-600"}`}
                  >
                    {isComplete ? "✓ Complete" : "✗ Incomplete"}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => {
            const updatedData: Record<string, any> = {};
            fields.forEach((field) => {
              if (field.type === "boolean") {
                updatedData[field.key] = true;
              } else if (field.type === "select" && field.options?.length) {
                updatedData[field.key] = field.options[0];
              } else if (field.type === "text" || field.type === "textarea") {
                updatedData[field.key] = "Completed";
              }
            });
            onChange(updatedData);
          }}
          className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
        >
          Mark All Complete
        </button>
        <button
          type="button"
          onClick={() => {
            const clearedData: Record<string, any> = {};
            fields.forEach((field) => {
              clearedData[field.key] = field.type === "boolean" ? false : "";
            });
            onChange(clearedData);
          }}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
