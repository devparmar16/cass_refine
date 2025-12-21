// // src/components/uploads/FileUploadModal.jsx
// import React, { useState } from 'react';
// import BaseModal from '../modals/BaseModal';

// export default function FileUploadModal({ open, onClose, onSubmit }) {
//   const [file, setFile] = useState(null);

//   return (
//     <BaseModal open={open} onClose={onClose} title="Upload File">
//       <div className="space-y-4">
//         <input
//           type="file"
//           className="w-full border rounded p-2"
//           onChange={e => setFile(e.target.files[0])}
//         />

//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded"
//           disabled={!file}
//           onClick={() => onSubmit({ file })}
//         >
//           Upload
//         </button>
//       </div>
//     </BaseModal>
//   );
// }
