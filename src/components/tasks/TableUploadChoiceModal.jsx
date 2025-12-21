export default function TableUploadChoiceModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4">
          How do you want to upload?
        </h2>

        <div className="flex flex-col gap-3">
          <button
            className="bg-blue-600 text-white py-2 rounded"
            onClick={() => onSelect('custom')}
          >
            Create Table Here
          </button>

          <button
            className="bg-gray-700 text-white py-2 rounded"
            onClick={() => onSelect('file')}
          >
            Upload Excel / CSV
          </button>
        </div>

        <button
          className="mt-4 text-sm text-gray-500 underline"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
