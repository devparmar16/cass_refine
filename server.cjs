// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const path = require('path');
// const drive = require('./src/lib/drive');
// const multer = require('multer');
// const upload = multer();
// const archiver = require('archiver');
// const { sendNotification } = require('./src/lib/notify.js');
// const { supabase } = require('./src/lib/drive.js');

// const app = express();
// const PORT = process.env.PORT || 5001;

// app.use(cors());
// app.use(bodyParser.json());

// // List files/folders in a parent folder
// app.post('/api/drive/list', async (req, res) => {
//   const { parentId } = req.body;
//   if (!parentId) {
//     return res.status(400).json({ error: 'parentId is required' });
//   }
//   try {
//     const files = await drive.listFiles(parentId);
//     res.json({ files });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Create full event folder structure
// app.post('/api/drive/create-event-folders', async (req, res) => {
//   const { eventName, rootId } = req.body;
//   if (!eventName || !rootId) {
//     return res.status(400).json({ error: 'eventName and rootId are required' });
//   }
//   try {
//     const eventFolderId = await drive.createEventFolderStructure(eventName, rootId);
//     res.json({ eventFolderId });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Create a folder in Google Drive
// app.post('/api/drive/create-folder', async (req, res) => {
//   const { name, parentId } = req.body;
//   if (!name || !parentId) {
//     return res.status(400).json({ error: 'name and parentId are required' });
//   }
//   try {
//     const folder = await drive.createFolder(name, parentId);
//     res.json({ folder });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Delete a file or folder in Google Drive
// app.post('/api/drive/delete', async (req, res) => {
//   const { fileId } = req.body;
//   if (!fileId) {
//     return res.status(400).json({ error: 'fileId is required' });
//   }
//   try {
//     await drive.deleteFile(fileId);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Rename a file or folder in Google Drive
// app.post('/api/drive/rename', async (req, res) => {
//   const { fileId, newName } = req.body;
//   if (!fileId || !newName) {
//     return res.status(400).json({ error: 'fileId and newName are required' });
//   }
//   try {
//     await drive.renameFile(fileId, newName);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Move a file or folder in Google Drive
// app.post('/api/drive/move', async (req, res) => {
//   const { fileId, newParentId } = req.body;
//   if (!fileId || !newParentId) {
//     return res.status(400).json({ error: 'fileId and newParentId are required' });
//   }
//   try {
//     await drive.moveFile(fileId, newParentId);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Upload a file to Google Drive
// app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
//   console.log('UPLOAD ROUTE HIT', req.body, req.file);
//   const { parentId } = req.body;

//   if (!req.file || !parentId) {
//     return res.status(400).json({ error: 'file and parentId are required' });
//   }

//   try {
//     const fileMeta = await drive.uploadFileToDrive(req.file, parentId);
//     console.log('UPLOAD SUCCESS', fileMeta);
//     res.json({ file: fileMeta });
//   } catch (err) {
//     console.error('UPLOAD ERROR', err); // <== log the error clearly
//     res.status(500).json({ error: err.message });
//   }
// });


// // Download a folder as zip from Google Drive
// app.get('/api/drive/download-folder', async (req, res) => {
//   const { folderId, folderName } = req.query;
//   if (!folderId) {
//     return res.status(400).json({ error: 'folderId is required' });
//   }
//   try {
//     // List all files in the folder (non-recursive for now)
//     const files = await drive.listFiles(folderId);
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', `attachment; filename="${folderName || 'folder'}.zip"`);
//     const archive = archiver('zip', { zlib: { level: 9 } });
//     archive.pipe(res);
//     for (const file of files) {
//       if (file.mimeType !== 'application/vnd.google-apps.folder') {
//         // Download file content from Drive
//         const fileStream = await drive.downloadFileStream(file.id);
//         archive.append(fileStream, { name: file.name });
//       // }
//     }
//     archive.finalize();
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Example: Notify Chair when a task is submitted for review
// app.post('/api/task/submit-for-review', async (req, res) => {
//   // ... your existing logic to handle the submission ...
//   // Example payload: { eventId, eventName, taskName, senderRole, senderEmail, chairEmail, chairRole }
//   const { eventId, eventName, taskName, senderRole, senderEmail, chairEmail, chairRole } = req.body;
//   try {
//     await sendNotification({
//       recipient_email: chairEmail,
//       recipient_role: chairRole,
//       sender_email: senderEmail,
//       sender_role: senderRole,
//       event_id: eventId,
//       event_name: eventName,
//       task_name: taskName,
//       type: 'task_review',
//       status: 'pending',
//       message: `${senderRole} submitted '${taskName}' for review in event '${eventName}'.`,
//     });
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Example: Notify Vice Chair when their task is approved/rejected
// app.post('/api/task/review-result', async (req, res) => {
//   // ... your existing logic to handle the review ...
//   // Example payload: { eventId, eventName, taskName, reviewerRole, reviewerEmail, viceChairEmail, viceChairRole, result }
//   const { eventId, eventName, taskName, reviewerRole, reviewerEmail, viceChairEmail, viceChairRole, result } = req.body;
//   try {
//     await sendNotification({
//       recipient_email: viceChairEmail,
//       recipient_role: viceChairRole,
//       sender_email: reviewerEmail,
//       sender_role: reviewerRole,
//       event_id: eventId,
//       event_name: eventName,
//       task_name: taskName,
//       type: 'review_result',
//       status: result,
//       message: `Your task '${taskName}' for event '${eventName}' was ${result}.`,
//     });
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Example: Notify all roles when a new event is created
// app.post('/api/event/created', async (req, res) => {
//   const { eventId, eventName, creatorEmail, creatorRole } = req.body;
//   console.log('Received /api/event/created payload:', req.body);
//   try {
//     // Fetch all users/roles from login table
//     const { data: users, error } = await supabase
//       .from('login')
//       .select('email, role');
//     if (error) throw new Error(error.message || error);

//     for (const { email, role } of users) {
//       console.log(`Sending notification to ${email} (${role}) for event '${eventName}'`);
//       await sendNotification({
//         recipient_email: email,
//         recipient_role: role,
//         sender_email: creatorEmail,
//         sender_role: creatorRole,
//         event_id: eventId,
//         event_name: eventName,
//         type: 'event_created',
//         status: 'info',
//         message: `A new event '${eventName}' has been created by ${creatorRole === 'chairperson' ? 'Chair Person' : 
//           creatorRole === 'vicechairperson' ? 'Vice Chairperson' : creatorRole}.`,
//       }).catch(err => {
//         console.error(`Error sending notification to ${email}:`, err);
//       });
//     }
//     console.log('All notifications attempted for event creation.');
//     res.json({ success: true });
//   } catch (err) {
//     console.error('Error in /api/event/created:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Fetch inbox notifications for a user
// app.get('/api/inbox', async (req, res) => {
//   const { email } = req.query;
//   if (!email) return res.status(400).json({ error: 'email is required' });
//   try {
//     const { data, error } = await supabase
//       .from('inbox_notifications')
//       .select('*')
//       .eq('recipient_email', email)
//       .order('created_at', { ascending: false });
//     if (error) throw new Error(error.message || error);
//     res.json({ notifications: data });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// }); 