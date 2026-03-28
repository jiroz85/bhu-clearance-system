interface FinanceCalculatorProps {
  departmentData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

export function FinanceCalculator({ departmentData, onChange }: FinanceCalculatorProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...departmentData, [key]: value });
  };

  const clearanceStatuses = ['Cleared', 'Partial', 'Pending'];
  
  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg">
      <h4 className="text-lg font-semibold text-green-900 mb-4">💰 Financial Clearance</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="tuitionFeesPaid"
            className="rounded border-slate-300 mr-2"
            checked={departmentData.tuitionFeesPaid || false}
            onChange={(e) => updateField('tuitionFeesPaid', e.target.checked)}
          />
          <label htmlFor="tuitionFeesPaid" className="text-sm font-medium text-slate-700">
            Tuition Fees Paid
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Outstanding Balance (ETB)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="Total outstanding amount"
            value={departmentData.outstandingBalance || ''}
            onChange={(e) => updateField('outstandingBalance', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Financial Clearance Status
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            className="w-full rounded border border-slate-300 p-2 text-sm"
            value={departmentData.financialClearance || ''}
            onChange={(e) => updateField('financialClearance', e.target.value)}
          >
            <option value="">Select clearance status</option>
            {clearanceStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Payment Receipt
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            onChange={(e) => updateField('paymentReceipt', e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="mt-4 p-3 bg-white rounded border border-green-200">
        <h5 className="text-sm font-medium text-slate-700 mb-3">Fee Breakdown Summary</h5>
        <div className="space-y-2">
          {[
            { key: 'tuitionFee', label: 'Tuition Fee', amount: 15000 },
            { key: 'libraryFee', label: 'Library Fee', amount: 500 },
            { key: 'dormitoryFee', label: 'Dormitory Fee', amount: 2000 },
            { key: 'cafeteriaFee', label: 'Cafeteria Fee', amount: 1000 },
            { key: 'sportsFee', label: 'Sports Fee', amount: 300 },
            { key: 'technologyFee', label: 'Technology Fee', amount: 800 },
          ].map(fee => (
            <div key={fee.key} className="flex justify-between items-center text-xs">
              <span className="text-slate-600">{fee.label}:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">ETB {fee.amount.toLocaleString()}</span>
                <input
                  type="checkbox"
                  id={`${fee.key}Paid`}
                  className="rounded border-slate-300"
                  checked={departmentData[`${fee.key}Paid`] || false}
                  onChange={(e) => updateField(`${fee.key}Paid`, e.target.checked)}
                />
                <label htmlFor={`${fee.key}Paid`} className="text-xs text-green-600">Paid</label>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total Expected:</span>
              <span className="text-sm font-bold text-green-600">ETB 19,600</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Status Summary */}
      <div className="mt-4 p-3 bg-white rounded border border-green-200">
        <h5 className="text-sm font-medium text-slate-700 mb-2">Financial Status</h5>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Tuition Status:</span>
            <span className={`font-medium ${departmentData.tuitionFeesPaid ? 'text-green-600' : 'text-red-600'}`}>
              {departmentData.tuitionFeesPaid ? '✓ Paid' : '✗ Unpaid'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Outstanding Balance:</span>
            <span className={`font-medium ${(departmentData.outstandingBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {(departmentData.outstandingBalance || 0) > 0 ? `ETB ${(departmentData.outstandingBalance || 0).toLocaleString()}` : '✓ Cleared'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Clearance Status:</span>
            <span className={`font-medium ${
              departmentData.financialClearance === 'Cleared' ? 'text-green-600' :
              departmentData.financialClearance === 'Partial' ? 'text-amber-600' :
              departmentData.financialClearance === 'Pending' ? 'text-red-600' :
              'text-slate-400'
            }`}>
              {departmentData.financialClearance || 'Not Set'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => {
            updateField('tuitionFeesPaid', true);
            updateField('outstandingBalance', 0);
            updateField('financialClearance', 'Cleared');
          }}
          className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
        >
          Mark Fully Cleared
        </button>
        <button
          type="button"
          onClick={() => updateField('financialClearance', 'Partial')}
          className="px-3 py-1 text-xs bg-amber-100 text-amber-600 rounded hover:bg-amber-200"
        >
          Mark Partial
        </button>
        <button
          type="button"
          onClick={() => updateField('outstandingBalance', 0)}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          Clear Balance
        </button>
      </div>
    </div>
  );
}
