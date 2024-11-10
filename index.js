// index.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, push, remove, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://leads-tracker-4c8e8-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const reference = ref(database, "jobs");

const saveBtn = document.getElementById("saveBtn");
const weekDoc = document.getElementById("week");
const job = document.getElementById("job");
const time = document.getElementById("time");

// Save a job entry to Firebase with a timestamp
saveBtn.addEventListener("click", () => {
    const jobNumber = job.value;
    const timeSpent = parseFloat(time.value);
    const timestamp = Date.now();

    // Push new entry under the specific job number
    const jobRef = ref(database, `jobs/${jobNumber}/entries`);
    push(jobRef, { timeSpent, timestamp });

    // Save job number as part of the data
    set(ref(database, `jobs/${jobNumber}/jobNumber`), jobNumber);
});

// Track jobs already rendered
const renderedJobs = new Map(); // Map to track job nodes

// Listen for new or updated job entries
onChildAdded(reference, (snapshot) => renderJob(snapshot));
onChildChanged(reference, (snapshot) => renderJob(snapshot));

// Listen for job removal
onChildRemoved(reference, (snapshot) => {
    const container = document.querySelector(".card-container");
    const card = renderedJobs.get(snapshot.key);
    if (card) {
        container.removeChild(card);
        renderedJobs.delete(snapshot.key);
    }
});

// Render or update a job entry
function renderJob(snapshot) {
    const data = snapshot.val();
    const jobId = snapshot.key;
    const container = document.querySelector(".card-container");

    // Calculate total time
    let totalTime = 0;
    let entriesHTML = "";
    if (data.entries) {
        entriesHTML = Object.values(data.entries)
            .map(entry => {
                totalTime += entry.timeSpent;
                return `
                    <p>Time Entry: ${entry.timeSpent} hours</p>
                    <p>Timestamp: ${new Date(entry.timestamp).toLocaleString()}</p>
                `;
            })
            .join("");

        // Update total time in Firebase
        set(ref(database, `jobs/${jobId}/totalTime`), totalTime);
    }

    // Create or update the card content
    let card = renderedJobs.get(jobId);
    if (!card) {
        // Create a new card if it doesn't exist
        card = document.createElement("div");
        card.classList.add("card");
        card.addEventListener("dblclick", () => {
            const jobRef = ref(database, `jobs/${jobId}`);
            remove(jobRef); // Delete job entry from Firebase
        });
        container.appendChild(card);
        renderedJobs.set(jobId, card); // Track the card
    }

    // Update the card's inner HTML
    card.innerHTML = `
        <p>Job Number: ${data.jobNumber || jobId}</p>
        ${entriesHTML}
        <p>Total Time: ${totalTime} hours</p>
    `;
}
