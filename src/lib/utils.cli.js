import { fetchTaskReviewInfo } from './utils.js';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node src/lib/utils.cli.js <taskIdOrName>");
  process.exit(1);
}
fetchTaskReviewInfo(arg)
  .then(info => {
    console.log("Full review info:", info);
    console.log("First review role:", info.role_review_one);
    console.log("Second review role:", info.role_review_two);
    console.log("Final review role:", info.final_review);
  })
  .catch(err => {
    console.error("Error fetching review info:", err);
  }); 