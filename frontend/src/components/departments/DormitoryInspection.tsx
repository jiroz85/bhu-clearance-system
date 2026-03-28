interface DormitoryInspectionProps {
  departmentData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

export function DormitoryInspection({ departmentData, onChange }: DormitoryInspectionProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...departmentData, [key]: value });
  };

  const inspectionStatuses = ['Passed', 'Minor Issues', 'Major Issues', 'Failed'];
  
  return (
    <div className="space-y-4 p-4 bg-amber-50 rounded-lg">
      <h4 className="text-lg font-semibold text-amber-900 mb-4">🏠 Dormitory Clearance & Inspection</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Room Number
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="e.g., A-101, B-205"
            value={departmentData.roomNumber || ''}
            onChange={(e) => updateField('roomNumber', e.target.value)}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="roomKeyReturned"
            className="rounded border-slate-300 mr-2"
            checked={departmentData.roomKeyReturned || false}
            onChange={(e) => updateField('roomKeyReturned', e.target.checked)}
          />
          <label htmlFor="roomKeyReturned" className="text-sm font-medium text-slate-700">
            Room Key Returned
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Room Inspection Status
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            className="w-full rounded border border-slate-300 p-2 text-sm"
            value={departmentData.inspectionStatus || ''}
            onChange={(e) => updateField('inspectionStatus', e.target.value)}
          >
            <option value="">Select inspection status</option>
            {inspectionStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Damage Fine (ETB)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded border border-slate-300 p-2 text-sm"
            placeholder="Damage fine amount"
            value={departmentData.damageFine || ''}
            onChange={(e) => updateField('damageFine', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Inspection Checklist */}
      <div className="mt-4 p-3 bg-white rounded border border-amber-200">
        <h5 className="text-sm font-medium text-slate-700 mb-3">Quick Inspection Checklist</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { key: 'wallsClean', label: 'Walls Clean' },
            { key: 'floorClean', label: 'Floor Clean' },
            { key: 'windowsIntact', label: 'Windows Intact' },
            { key: 'furnitureIntact', label: 'Furniture Intact' },
            { key: 'electricalWorking', label: 'Electrical Working' },
            { key: 'bathroomClean', label: 'Bathroom Clean' },
            { key: 'noPersonalItems', label: 'No Personal Items' },
            { key: 'garbageRemoved', label: 'Garbage Removed' },
          ].map(item => (
            <div key={item.key} className="flex items-center">
              <input
                type="checkbox"
                id={item.key}
                className="rounded border-slate-300 mr-1"
                checked={departmentData[item.key] || false}
                onChange={(e) => updateField(item.key, e.target.checked)}
              />
              <label htmlFor={item.key} className="text-slate-600">{item.label}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Room Status Summary */}
      <div className="mt-4 p-3 bg-white rounded border border-amber-200">
        <h5 className="text-sm font-medium text-slate-700 mb-2">Room Status Summary</h5>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Key Return:</span>
            <span className={`font-medium ${departmentData.roomKeyReturned ? 'text-green-600' : 'text-red-600'}`}>
              {departmentData.roomKeyReturned ? '✓ Returned' : '✗ Not Returned'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Inspection:</span>
            <span className={`font-medium ${
              departmentData.inspectionStatus === 'Passed' ? 'text-green-600' :
              departmentData.inspectionStatus === 'Failed' ? 'text-red-600' :
              departmentData.inspectionStatus ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {departmentData.inspectionStatus || 'Not Inspected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Damage Fine:</span>
            <span className={`font-medium ${(departmentData.damageFine || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {(departmentData.damageFine || 0) > 0 ? `ETB ${departmentData.damageFine}` : 'No Damage'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => updateField('inspectionStatus', 'Passed')}
          className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
        >
          Mark Passed
        </button>
        <button
          type="button"
          onClick={() => updateField('damageFine', 0)}
          className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          Clear Fine
        </button>
        <button
          type="button"
          onClick={() => {
            updateField('roomKeyReturned', true);
            updateField('inspectionStatus', 'Passed');
            updateField('damageFine', 0);
          }}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          All Clear
        </button>
      </div>
    </div>
  );
}
