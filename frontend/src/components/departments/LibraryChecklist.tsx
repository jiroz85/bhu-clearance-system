interface LibraryChecklistProps {
  departmentData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

export function LibraryChecklist({
  departmentData,
  onChange,
}: LibraryChecklistProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...departmentData, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
      <h4 className="text-lg font-semibold text-blue-900 mb-4">
        📚 Library Clearance Checklist
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Books Returned
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="Number of books returned"
            value={departmentData.booksReturned || ""}
            onChange={(e) =>
              updateField("booksReturned", parseInt(e.target.value) || 0)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Outstanding Books
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="Number of books still outstanding"
            value={departmentData.outstandingBooks || ""}
            onChange={(e) =>
              updateField("outstandingBooks", parseInt(e.target.value) || 0)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Fine Amount (ETB)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="Total fine amount"
            value={departmentData.fineAmount || ""}
            onChange={(e) =>
              updateField("fineAmount", parseFloat(e.target.value) || 0)
            }
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="finePaid"
            className="rounded border-slate-300 mr-2"
            checked={departmentData.finePaid || false}
            onChange={(e) => updateField("finePaid", e.target.checked)}
          />
          <label
            htmlFor="finePaid"
            className="text-sm font-medium text-slate-700"
          >
            Fine Paid
          </label>
        </div>
      </div>

      {/* Library Status Indicators */}
      <div className="mt-4 p-3 bg-white rounded border border-blue-200">
        <h5 className="text-sm font-medium text-slate-700 mb-2">
          Library Status
        </h5>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Return Status:</span>
            <span
              className={`font-medium ${(departmentData.outstandingBooks || 0) === 0 ? "text-green-600" : "text-red-600"}`}
            >
              {(departmentData.outstandingBooks || 0) === 0
                ? "✓ All Clear"
                : `${departmentData.outstandingBooks || 0} Outstanding`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fine Status:</span>
            <span
              className={`font-medium ${(departmentData.fineAmount || 0) === 0 || departmentData.finePaid ? "text-green-600" : "text-amber-600"}`}
            >
              {(departmentData.fineAmount || 0) === 0
                ? "No Fine"
                : departmentData.finePaid
                  ? "✓ Paid"
                  : `ETB ${departmentData.fineAmount || 0}`}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => updateField("booksReturned", 0)}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          Reset Count
        </button>
        <button
          type="button"
          onClick={() => updateField("fineAmount", 0)}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          Clear Fine
        </button>
        <button
          type="button"
          onClick={() => updateField("finePaid", true)}
          className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
        >
          Mark Paid
        </button>
      </div>
    </div>
  );
}
